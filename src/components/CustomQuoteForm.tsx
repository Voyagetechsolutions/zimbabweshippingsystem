
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomQuoteFormProps {
  bookingData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const CustomQuoteForm: React.FC<CustomQuoteFormProps> = ({ 
  bookingData = {},
  onSubmit,
  onCancel
}) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: bookingData?.firstName && bookingData?.lastName 
        ? `${bookingData.firstName} ${bookingData.lastName}`
        : bookingData?.senderDetails?.name || '',
      email: bookingData?.email || bookingData?.senderDetails?.email || '',
      phoneNumber: bookingData?.phone || bookingData?.senderDetails?.phone || '',
      description: bookingData?.otherItemDescription || bookingData?.shipmentDetails?.description || '',
      category: bookingData?.itemCategory || bookingData?.shipmentDetails?.category || '',
      specificItem: bookingData?.specificItem || bookingData?.shipmentDetails?.specificItem || '',
    }
  });
  
  const onFormSubmit = async (data: any) => {
    try {
      const formData = {
        ...data,
        imageUrls
      };
      
      onSubmit(formData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit form",
        variant: "destructive"
      });
    }
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    try {
      setUploading(true);
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('custom-quotes')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('custom-quotes')
        .getPublicUrl(filePath);
      
      setImageUrls([...imageUrls, publicUrl]);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset the file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };
  
  const removeImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };
  
  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            {...register("name", { required: "Name is required" })}
            placeholder="Your full name"
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message as string}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
          <Input
            id="email"
            type="email"
            {...register("email", { 
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address"
              }
            })}
            placeholder="Your email address"
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="phoneNumber">Phone Number <span className="text-red-500">*</span></Label>
          <Input
            id="phoneNumber"
            {...register("phoneNumber", { required: "Phone number is required" })}
            placeholder="Your phone number"
            className={errors.phoneNumber ? "border-red-500" : ""}
          />
          {errors.phoneNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.phoneNumber.message as string}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="category">Item Category</Label>
          <Input
            id="category"
            {...register("category")}
            placeholder="E.g. Electronics, Clothing, etc."
          />
        </div>
        
        <div>
          <Label htmlFor="specificItem">Specific Item</Label>
          <Input
            id="specificItem"
            {...register("specificItem")}
            placeholder="Laptop, TV, etc."
          />
        </div>
        
        <div>
          <Label htmlFor="description">Item Description <span className="text-red-500">*</span></Label>
          <Textarea
            id="description"
            {...register("description", { required: "Description is required" })}
            placeholder="Please describe the item you want to ship in detail..."
            className={errors.description ? "border-red-500" : ""}
            rows={4}
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message as string}</p>
          )}
        </div>
        
        <div className="space-y-3">
          <Label>Item Images (Optional)</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative">
                <Card className="overflow-hidden">
                  <AspectRatio ratio={1 / 1}>
                    <img
                      src={url}
                      alt={`Item image ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </AspectRatio>
                </Card>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-1 right-1 w-6 h-6"
                  onClick={() => removeImage(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            
            <div>
              <Label
                htmlFor="imageUpload"
                className="block border-2 border-dashed border-gray-300 rounded-md p-6 h-full flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <input
                  id="imageUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="sr-only"
                  disabled={uploading}
                />
                <div className="flex flex-col items-center text-center space-y-2">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900"></div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-500">Upload Image</span>
                    </>
                  )}
                </div>
              </Label>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Upload up to 5 images to help us provide an accurate quote
          </p>
        </div>
      </div>
      
      <div className="flex justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || uploading}
        >
          {isSubmitting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            "Submit for Quote"
          )}
        </Button>
      </div>
    </form>
  );
};

export default CustomQuoteForm;
