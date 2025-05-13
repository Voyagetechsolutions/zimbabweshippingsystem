
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, X, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generateUniqueId } from '@/utils/utils';

// Form validation schema
const customQuoteSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  phoneNumber: z.string().min(5, { message: 'Please enter a valid phone number' }),
  description: z.string().min(10, { message: 'Please provide a detailed description (min 10 characters)' }),
  category: z.string().optional(),
});

type CustomQuoteFormData = z.infer<typeof customQuoteSchema>;

interface CustomQuoteFormNewProps {
  bookingData?: any;
  onCancel?: () => void;
  onSubmit?: (data: any) => void;
}

const CustomQuoteFormNew: React.FC<CustomQuoteFormNewProps> = ({ 
  bookingData, 
  onCancel, 
  onSubmit 
}) => {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize form with default values
  const form = useForm<CustomQuoteFormData>({
    resolver: zodResolver(customQuoteSchema),
    defaultValues: {
      name: bookingData?.firstName ? `${bookingData.firstName} ${bookingData.lastName || ''}` : '',
      email: bookingData?.email || '',
      phoneNumber: bookingData?.phone || '',
      description: '',
      category: '',
    },
  });

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
      toast({
        title: "Invalid File Type",
        description: "Please upload only image files",
        variant: "destructive",
      });
      return;
    }
    
    setImageFiles(prev => [...prev, ...validFiles]);
  };

  // Remove image from preview
  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload images to Supabase storage
  const uploadImagesToStorage = async () => {
    if (imageFiles.length === 0) return [];
    
    setUploading(true);
    const urls: string[] = [];
    
    try {
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${generateUniqueId('quote_')}.${fileExt}`;
        const filePath = `custom_quotes/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('public')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });
        
        if (error) {
          throw error;
        }
        
        const { data: urlData } = supabase.storage
          .from('public')
          .getPublicUrl(data.path);
          
        urls.push(urlData.publicUrl);
      }
      
      return urls;
    } catch (error: any) {
      console.error("Error uploading images:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
      return [];
    } finally {
      setUploading(false);
    }
  };

  // Submit custom quote request
  const handleSubmitForm = async (data: CustomQuoteFormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit a custom quote request",
        variant: "destructive",
      });
      navigate('/auth'); // Redirect to authentication page
      return;
    }
    
    setUploading(true);
    
    try {
      // Upload images if any
      const uploadedImageUrls = await uploadImagesToStorage();
      
      const quoteData = {
        user_id: user.id,
        shipment_id: bookingData?.shipment_id || null,
        name: data.name,
        email: data.email,
        phone_number: data.phoneNumber,
        description: data.description,
        category: data.category || null,
        image_urls: uploadedImageUrls,
        status: 'pending',
        quoted_amount: null,
        sender_details: bookingData?.senderDetails || {},
        recipient_details: bookingData?.recipientDetails || {},
      };
      
      // Submit to the database
      const { data: quote, error } = await supabase
        .from('custom_quotes')
        .insert(quoteData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create notification for the user
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Custom Quote Requested',
        message: `Your custom quote request for "${data.description.substring(0, 30)}..." has been submitted. We'll review it shortly.`,
        type: 'custom_quote',
        related_id: quote.id,
        is_read: false
      });
      
      // Success message
      toast({
        title: "Quote Request Submitted",
        description: "We'll review your request and contact you with a quote soon.",
      });
      
      // Call the onSubmit callback if provided
      if (onSubmit) {
        onSubmit({
          ...quoteData,
          id: quote.id,
          imageUrls: uploadedImageUrls,
        });
      } else {
        // Navigate to dashboard if no callback
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error("Error submitting quote:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit your quote request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Request a Custom Quote</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
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
                      <Input placeholder="your.email@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+44 7700 900000" {...field} />
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
                  <FormLabel>Category (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Electronics, Furniture, Clothing" {...field} />
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
                      placeholder="Please provide a detailed description of the item you want to ship..." 
                      className="min-h-[120px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-3">
              <div>
                <FormLabel>Upload Images (Optional)</FormLabel>
                <div className="mt-2">
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 10MB</p>
                      </div>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Image Preview */}
              {imageFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Images:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {imageFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded overflow-hidden bg-gray-100 border">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-between pt-4">
              {onCancel ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  className="flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              ) : (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(-1)}
                  className="flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={uploading}
                className="bg-zim-green hover:bg-zim-green/90"
              >
                {uploading ? 'Submitting...' : 'Submit Quote Request'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CustomQuoteFormNew;
