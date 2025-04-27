
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CustomQuoteFormProps {
  initialData: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const itemCategories = {
  'furniture': ['Sofa', 'Chair', 'Dining Table & Chairs', 'Coffee Table', 'Bed', 'Mattress', 'Wardrobe (dismantled)', 'Chest of Drawers', 'Dressing Unit', 'Wall Frame', 'Mirror', 'Home Furniture (other)', 'Office Furniture'],
  'appliances': ['Washing Machine', 'Dishwasher', 'Dryer', 'American Fridge', 'Standard Fridge', 'Freezer', 'Deep Freezer', 'TV', 'Air Conditioner', 'Heater'],
  'garden': ['Garden Tools', 'Lawn Mower', 'Trampoline'],
  'transportation': ['Bicycle', 'Car Wheels/Tyres', 'Vehicle Parts', 'Engine', 'Mobility Scooter'],
  'household': ['Plastic Tubs', 'Bin', 'Ironing Board', 'Rugs', 'Carpets', 'Internal Doors', 'External Doors', 'Bathroom Equipment'],
  'mobility': ['Wheelchair', 'Adult Walking Aid', 'Kids Push Chair'],
  'storage': ['Boxes', 'Bags', 'Suitcase', 'Amazon Bag', 'China Bags', 'Pallets'],
  'equipment': ['Tool Box', 'Air Compressor', 'Generator', 'Solar Panel', 'Water Pump', 'Pool Pump'],
  'building': ['Building Materials', 'Home Decor', 'Ladders'],
  'other': ['Other Item']
};

const CustomQuoteForm: React.FC<CustomQuoteFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [phoneNumber, setPhoneNumber] = useState(initialData?.senderDetails?.phone || '');
  const [category, setCategory] = useState(initialData?.itemCategory || '');
  const [specificItem, setSpecificItem] = useState(initialData?.specificItem || '');
  const [otherDescription, setOtherDescription] = useState(initialData?.otherItemDescription || '');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
      
      // Create preview URLs for the images
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviewUrls = [...imagePreviewUrls];
    
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(newPreviewUrls[index]);
    
    newImages.splice(index, 1);
    newPreviewUrls.splice(index, 1);
    
    setImages(newImages);
    setImagePreviewUrls(newPreviewUrls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber) {
      toast({
        title: "Missing information",
        description: "Please provide your phone number.",
        variant: "destructive",
      });
      return;
    }
    
    if (!category || (category !== 'other' && !specificItem) || (specificItem === 'Other' && !otherDescription)) {
      toast({
        title: "Missing information",
        description: "Please specify your item details.",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    
    try {
      const urls: string[] = [];
      
      if (images.length > 0) {
        for (const file of images) {
          const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('custom-quotes')
            .upload(fileName, file);
          
          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabase.storage
            .from('custom-quotes')
            .getPublicUrl(fileName);
          
          urls.push(publicUrlData.publicUrl);
        }
      }
      
      // Clean up preview URLs to avoid memory leaks
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      
      const description = specificItem === 'Other' ? otherDescription : specificItem;
      
      onSubmit({
        phoneNumber,
        category,
        specificItem,
        description,
        imageUrls: urls
      });
      
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload images. Please try again.',
        variant: 'destructive',
      });
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-6 p-4 border-l-4 border-blue-500 bg-blue-50">
        <h3 className="font-semibold text-blue-800 mb-2">How Custom Quotes Work</h3>
        <ol className="list-decimal ml-5 space-y-2">
          <li>Enter your phone number so we can contact you with the quote</li>
          <li>Select the category and specific item you want to ship</li>
          <li>Upload photos of your item(s) to help us provide an accurate quote</li>
          <li>Submit your request and our team will contact you within 24 hours</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <Input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full"
            placeholder="+44 7123 456789"
            required
          />
        </div>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Item Category *
          </label>
          <Select 
            value={category} 
            onValueChange={(value) => {
              setCategory(value);
              setSpecificItem('');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="furniture">Furniture</SelectItem>
              <SelectItem value="appliances">Appliances</SelectItem>
              <SelectItem value="garden">Garden Items</SelectItem>
              <SelectItem value="transportation">Transportation</SelectItem>
              <SelectItem value="household">Household Items</SelectItem>
              <SelectItem value="mobility">Mobility Aids</SelectItem>
              <SelectItem value="storage">Storage Items</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="building">Building Materials</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {category && category !== 'other' && (
          <div>
            <label htmlFor="specificItem" className="block text-sm font-medium text-gray-700 mb-1">
              Specific Item *
            </label>
            <Select 
              value={specificItem} 
              onValueChange={setSpecificItem}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {itemCategories[category as keyof typeof itemCategories]?.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {(category === 'other' || specificItem === 'Other') && (
          <div>
            <label htmlFor="otherDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Item Description *
            </label>
            <Textarea
              id="otherDescription"
              value={otherDescription}
              onChange={(e) => setOtherDescription(e.target.value)}
              className="w-full resize-none"
              rows={4}
              placeholder="Please provide details about the item(s) including size, weight, condition, etc."
              required
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Upload Images *
          </label>
          
          {/* Image preview area */}
          {imagePreviewUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative border rounded-md overflow-hidden h-24">
                  <img 
                    src={url} 
                    alt={`Preview ${index}`} 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-gray-50">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600 justify-center">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-zim-green hover:text-zim-green/80 focus-within:outline-none px-3 py-2 border border-gray-300"
                >
                  <span>Upload Images</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    onChange={handleImageChange}
                    accept="image/*"
                    multiple
                    required={images.length === 0}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={uploading}
            className="bg-zim-green hover:bg-zim-green/90"
          >
            {uploading ? 'Uploading...' : 'Submit Quote Request'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CustomQuoteForm;
