
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Add the bookingData prop to the component props
interface CustomQuoteFormProps {
  bookingData?: any; 
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const CustomQuoteForm: React.FC<CustomQuoteFormProps> = ({ bookingData, onSubmit, onCancel }) => {
  const [category, setCategory] = useState<string>(bookingData?.shipmentDetails?.category || '');
  const [description, setDescription] = useState<string>(bookingData?.shipmentDetails?.description || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(bookingData?.senderDetails?.phone || '');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    setImages(Array.from(files));
  };

  const uploadImages = async () => {
    if (images.length === 0) {
      toast({
        title: "No Images Selected",
        description: "Please select images to upload.",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    const newImageUrls: string[] = [];
    
    for (const image of images) {
      const imageName = `${uuidv4()}-${image.name}`;
      
      try {
        const { data, error } = await supabase
          .storage
          .from('custom-quote-images')
          .upload(imageName, image, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          console.error("Error uploading image:", error);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${image.name}. Please try again.`,
            variant: "destructive",
          });
          setUploading(false);
          return;
        }
        
        // Fix: Generate public URL correctly using createSignedUrl or getPublicUrl
        const { data: publicUrlData } = supabase
          .storage
          .from('custom-quote-images')
          .getPublicUrl(data.path);
        
        newImageUrls.push(publicUrlData.publicUrl);
        
        toast({
          title: "Upload Complete",
          description: `${image.name} uploaded successfully.`,
        });
      } catch (err) {
        console.error("Error during upload:", err);
        toast({
          title: "Upload Error",
          description: `An error occurred while uploading ${image.name}.`,
          variant: "destructive",
        });
        setUploading(false);
        return;
      }
    }
    
    setImageUrls(prevImageUrls => [...prevImageUrls, ...newImageUrls]);
    setUploading(false);
    setImages([]);
  };

  const handleRemoveImage = (urlToRemove: string) => {
    setImageUrls(prevImageUrls => prevImageUrls.filter(url => url !== urlToRemove));
  };

  const handleSubmit = () => {
    if (!category || !description || !phoneNumber) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    
    onSubmit({
      category,
      description,
      phoneNumber,
      imageUrls
    });
  };

  return (
    <Card className="bg-white shadow-md rounded-lg">
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Custom Quote Request</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="category">Item Category</Label>
            <Select onValueChange={setCategory} defaultValue={category}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
                <SelectItem value="food">Food Items</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description">Item Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the item you want to ship"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              type="tel"
              id="phoneNumber"
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          
          {/*<div>
            <Label>Upload Images (Optional)</Label>
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="imageUpload"
            />
            <div className="flex items-center justify-between">
              <Label htmlFor="imageUpload" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md">
                <Upload className="h-4 w-4 mr-2 inline-block" />
                {images.length > 0 ? `Selected ${images.length} images` : 'Select Images'}
              </Label>
              <Button type="button" variant="secondary" onClick={uploadImages} disabled={uploading || images.length === 0}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            
            {imageUrls.length > 0 && (
              <div className="mt-4">
                <p className="font-medium">Uploaded Images:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {imageUrls.map((url) => (
                    <div key={url} className="relative">
                      <img src={url} alt="Uploaded item" className="w-24 h-24 object-cover rounded-md" />
                      <Button 
                        type="button"
                        onClick={() => handleRemoveImage(url)}
                        className="absolute top-0 right-0 bg-red-500 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>*/}
          
          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Submit Request
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CustomQuoteForm;
