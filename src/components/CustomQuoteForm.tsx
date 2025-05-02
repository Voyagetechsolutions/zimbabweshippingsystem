import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomQuoteFormProps {
  bookingData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const CustomQuoteForm: React.FC<CustomQuoteFormProps> = ({
  bookingData,
  onSubmit,
  onCancel
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    try {
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      setUploading(true);
      
      const { data, error } = await supabase.storage
        .from('custom-quote-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error("Error uploading image:", error);
        throw error;
      }
      
      const publicURL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/custom-quote-images/${filePath}`;
      setImageUrls(prevImageUrls => [...prevImageUrls, publicURL]);
      
      toast({
        title: "Upload Successful",
        description: "Image uploaded successfully.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const handleRemoveImage = (urlToRemove: string) => {
    setImageUrls(prevImageUrls => prevImageUrls.filter(url => url !== urlToRemove));
  };

  const handleSubmit = () => {
    if (!phoneNumber || !description || !category) {
      toast({
        title: "Missing Information",
        description: "Please provide your phone number, item description, and category.",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      phoneNumber,
      description,
      category,
      imageUrls
    });
  };
  
  useEffect(() => {
    if (bookingData) {
      setPhoneNumber(bookingData.senderDetails?.phone || '');
      setCategory(bookingData.shipmentDetails?.category || '');
      setDescription(bookingData.shipmentDetails?.description || '');
    }
  }, [bookingData]);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Describe Your Item</h3>
        <p className="text-gray-600">Please provide as much detail as possible about the item you want to ship.</p>
      </div>
      
      <div className="grid gap-4">
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
        
        <div>
          <Label htmlFor="itemCategory">Item Category</Label>
          <Select onValueChange={setCategory} defaultValue={category}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="clothing">Clothing</SelectItem>
              <SelectItem value="furniture">Furniture</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
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
          <Label>
            Upload Images (Optional)
            <Input
              type="file"
              id="imageUpload"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              asChild
              variant="secondary"
              disabled={uploading}
            >
              <Label htmlFor="imageUpload" className="flex items-center cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </>
                )}
              </Label>
            </Button>
          </Label>
          
          <div className="mt-2 flex flex-wrap gap-2">
            {imageUrls.map((url) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt="Uploaded item"
                  className="h-24 w-24 rounded-md object-cover"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 rounded-full shadow-md hover:bg-gray-200"
                  onClick={() => handleRemoveImage(url)}
                >
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="border-t mt-6 pt-6">
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-zim-green hover:bg-zim-green/90"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CustomQuoteForm;
