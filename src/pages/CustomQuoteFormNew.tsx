
import React, { useState, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ImagePlus, X, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define the form validation schema
const quoteFormSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone_number: z.string().min(5, 'Phone number is required'),
  description: z.string().min(10, 'Please provide a detailed description'),
  category: z.string().optional(),
  specific_item: z.string().optional(),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

const CustomQuoteFormNew = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user is authenticated
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };
    
    checkAuth();
  }, []);

  // Define form with validation
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      description: '',
      category: 'Household',
      specific_item: '',
    },
  });

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedImages(prev => [...prev, ...files]);
    }
  };

  // Remove selected image
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Upload images to Supabase storage
  const uploadImages = async (): Promise<string[]> => {
    const imageUrls: string[] = [];
    
    if (selectedImages.length === 0) {
      return imageUrls;
    }

    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `custom_quotes/${fileName}`;
        
        // Upload the file to Supabase storage
        const { error } = await supabase.storage
          .from('images')
          .upload(filePath, file);
        
        if (error) {
          throw new Error(`Error uploading image: ${error.message}`);
        }
        
        // Get the public URL for the uploaded image
        const { data } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
        
        imageUrls.push(data.publicUrl);
        
        // Update progress
        setUploadProgress(Math.floor(((i + 1) / selectedImages.length) * 100));
      }
      
      return imageUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Error uploading images',
        description: 'There was an error uploading your images. Please try again.',
        variant: 'destructive',
      });
      return imageUrls;
    }
  };

  // Form submission handler
  const onSubmit = async (values: QuoteFormValues) => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to submit a custom quote request.',
        variant: 'destructive',
      });
      navigate('/auth', { state: { returnUrl: '/custom-quote-new' } });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload any selected images
      const imageUrls = await uploadImages();
      
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create a new custom quote entry
      const { data, error } = await supabase.from('custom_quotes').insert({
        name: values.name,
        email: values.email,
        phone_number: values.phone_number,
        description: values.description,
        category: values.category || 'Other',
        specific_item: values.specific_item,
        image_urls: imageUrls,
        status: 'pending',
        user_id: user?.id,
      }).select();
      
      if (error) throw error;
      
      toast({
        title: 'Quote Request Submitted',
        description: 'Your custom quote request has been submitted successfully!',
      });
      
      // Redirect to quote confirmation page
      navigate('/quote-submitted', { state: { quoteData: data[0] } });
      
    } catch (error: any) {
      console.error('Error submitting quote request:', error);
      toast({
        title: 'Submission Error',
        description: error.message || 'There was an error submitting your quote request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  // Authentication alert message
  const AuthAlert = () => (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertDescription>
        {isAuthenticated === false ? 
          'Please sign in to submit a custom quote request.' : 
          'You will be able to track the status of your quote request in your dashboard.'}
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Request a Custom Quote</CardTitle>
          <CardDescription>
            Fill out the form below with details about the item you'd like to ship, and we'll provide you with a personalized quote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAuthenticated !== null && <AuthAlert />}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Household">Household Goods</SelectItem>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                        <SelectItem value="Furniture">Furniture</SelectItem>
                        <SelectItem value="Clothing">Clothing</SelectItem>
                        <SelectItem value="Auto">Auto Parts</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="specific_item"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Item (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Sony TV, Leather Sofa, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please describe the item(s) you want to ship in detail, including dimensions, weight, and any special handling requirements."
                        className="h-32"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel className="block mb-2">Images (Optional)</FormLabel>
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Add Images
                  </Button>
                  <span className="text-sm text-gray-500">Up to 5 images</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={selectedImages.length >= 5}
                  />
                </div>
                
                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                    {selectedImages.map((image, index) => (
                      <div
                        key={index}
                        className="relative rounded-md border overflow-hidden group"
                      >
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Selected image ${index + 1}`}
                          className="h-24 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadProgress > 0
                        ? `Uploading Images (${uploadProgress}%)`
                        : 'Submitting...'}
                    </>
                  ) : (
                    'Submit Quote Request'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-between flex-col sm:flex-row border-t pt-6">
          <p className="text-sm text-gray-500 mb-2 sm:mb-0">
            We'll review your request and get back to you within 24 hours.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CustomQuoteFormNew;
