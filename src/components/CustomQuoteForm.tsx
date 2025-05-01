import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CustomQuoteFormProps {
  initialData: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const CustomQuoteForm: React.FC<CustomQuoteFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.shipmentDetails?.description || initialData.otherItemDescription || '');
      setCategory(initialData.shipmentDetails?.category || initialData.itemCategory || '');
      setPhoneNumber(initialData.senderDetails?.phone || initialData.phone || '');
    }
  }, [initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Validate file size (max 5MB per file)
      const oversizedFiles = selectedFiles.filter(file => file.size > 5 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast({
          title: "File too large",
          description: "One or more files exceed the 5MB limit.",
          variant: "destructive",
        });
        return;
      }
      
      // Limit to 5 images total
      if (images.length + selectedFiles.length > 5) {
        toast({
          title: "Too many images",
          description: "You can upload a maximum of 5 images.",
          variant: "destructive",
        });
        return;
      }
      
      setImages(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    
    setIsUploading(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const image of images) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `custom-quotes/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('shipment-images')
          .upload(filePath, image);
        
        if (uploadError) {
          throw uploadError;
        }
        
        const { data } = supabase.storage
          .from('shipment-images')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(data.publicUrl);
      }
      
      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload one or more images. Please try again.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description) {
      toast({
        title: "Missing Information",
        description: "Please provide a description of your item.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload images if any
      const urls = await uploadImages();
      setImageUrls(urls);
      
      // Prepare data for submission
      const quoteData = {
        description,
        category,
        phoneNumber,
        imageUrls: urls,
      };
      
      // Call the parent component's onSubmit function
      onSubmit(quoteData);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit your quote request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Item Category</Label>
              <Select 
                value={category} 
                onValueChange={setCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="appliances">Appliances</SelectItem>
                  <SelectItem value="automotive">Automotive Parts</SelectItem>
                  <SelectItem value="medical">Medical Supplies</SelectItem>
                  <SelectItem value="food">Food Items</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="description">Item Description</Label>
              <Textarea
                id="description"
                placeholder="Please describe your item in detail including dimensions, weight, and any special handling requirements"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phoneNumber">Contact Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Your phone number for quote follow-up"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll contact you on this number with your custom quote
              </p>
            </div>
            
            <div>
              <Label htmlFor="images">Upload Images (Optional)</Label>
              <div className="mt-2">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG or JPEG (MAX. 5MB each)
                      </p>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      className="hidden"
                      accept="image/png, image/jpeg, image/jpg"
                      multiple
                      onChange={handleImageChange}
                      disabled={isUploading || images.length >= 5}
                    />
                  </label>
                </div>
              </div>
              
              {images.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Selected Images ({images.length}/5):</p>
                  <div className="flex flex-wrap gap-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <div className="h-20 w-20 rounded-md overflow-hidden border">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                          disabled={isUploading}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || isUploading}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading || !description}
            >
              {(isSubmitting || isUploading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit Quote Request
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomQuoteForm;
