import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Upload, X, Plus, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomQuoteFormProps {
  initialData: any;
  onSubmit: (customQuoteData: any) => Promise<void>;
  onCancel: () => void;
}

const CustomQuoteForm: React.FC<CustomQuoteFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [category, setCategory] = useState(initialData?.shipmentDetails?.category || '');
  const [specificItem, setSpecificItem] = useState(initialData?.shipmentDetails?.specificItem || '');
  const [description, setDescription] = useState(initialData?.shipmentDetails?.description || '');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.senderDetails?.phone || '');
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const categories = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'vehicles', label: 'Vehicles or Parts' },
    { value: 'medical', label: 'Medical Equipment' },
    { value: 'construction', label: 'Construction Materials' },
    { value: 'other', label: 'Other' },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Check file size (limit to 5MB per file)
      const oversizedFiles = selectedFiles.filter(file => file.size > 5 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast({
          title: "File too large",
          description: "Images must be less than 5MB each",
          variant: "destructive"
        });
        return;
      }
      
      // Limit to 5 images total
      if (images.length + selectedFiles.length > 5) {
        toast({
          title: "Too many images",
          description: "You can upload a maximum of 5 images",
          variant: "destructive"
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
    
    setUploading(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const image of images) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `custom_quotes/${initialData.shipment_id || 'unassigned'}/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('shipment-images')
          .upload(filePath, image);
          
        if (error) {
          throw error;
        }
        
        const { data: urlData } = supabase.storage
          .from('shipment-images')
          .getPublicUrl(filePath);
          
        uploadedUrls.push(urlData.publicUrl);
      }
      
      return uploadedUrls;
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload images",
        variant: "destructive"
      });
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !description) {
      setError('Please provide a category and description for your item');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // Upload images if any
      const urls = await uploadImages();
      
      // Combine with any existing image URLs
      const allImageUrls = [...imageUrls, ...urls];
      
      await onSubmit({
        category,
        specificItem,
        description,
        phoneNumber,
        imageUrls: allImageUrls
      });
    } catch (error: any) {
      setError(error.message || 'Failed to submit custom quote request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
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
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="specificItem">Specific Item (Optional)</Label>
              <Input
                id="specificItem"
                value={specificItem}
                onChange={(e) => setSpecificItem(e.target.value)}
                placeholder="e.g. Samsung TV, Sofa Set, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="description">Item Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide details about your item including dimensions, weight, and any special handling requirements"
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="phoneNumber">Contact Phone Number</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+44 123 456 7890"
              />
              <p className="text-sm text-gray-500 mt-1">
                We'll contact you on this number with your custom quote
              </p>
            </div>
            
            <div>
              <Label>Upload Images (Optional)</Label>
              <div className="mt-2 flex flex-wrap gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative w-24 h-24 border rounded overflow-hidden">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Item preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
                
                {images.length < 5 && (
                  <label className="w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                    <Plus className="h-6 w-6 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Add Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Max 5 images, 5MB each. Images help us provide an accurate quote.
              </p>
            </div>
          </div>
          
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || uploading}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || uploading}
            >
              {(isSubmitting || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Submitting...' : uploading ? 'Uploading Images...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomQuoteForm;
