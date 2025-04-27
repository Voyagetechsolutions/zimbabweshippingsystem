
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomQuoteFormProps {
  initialData: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const itemCategories = [
  { value: 'furniture', label: 'Furniture', items: [
    'Sofa', 'Chair', 'Dining Table and Chairs', 'Coffee Table', 'Bed', 'Mattress', 
    'Dismantled Wardrobe', 'Chest of Drawers', 'Dressing Unit', 'Home Furniture', 'Office Furniture'
  ]},
  { value: 'appliances', label: 'Appliances', items: [
    'Washing Machine', 'Dishwasher', 'Dryer', 'American Fridge', 'Standard Fridge', 
    'Freezer', 'Deep Freezer', 'TV'
  ]},
  { value: 'outdoor', label: 'Outdoor/Garden', items: [
    'Garden Tools', 'Lawn Mower', 'Trampoline', 'Ladder'
  ]},
  { value: 'mobility', label: 'Mobility Aids', items: [
    'Wheelchair', 'Adult Walking Aid', 'Mobility Scooter', 'Kids Push Chair'
  ]},
  { value: 'automotive', label: 'Automotive', items: [
    'Car Wheels/Tyres', 'Vehicle Parts', 'Engines'
  ]},
  { value: 'household', label: 'Household Items', items: [
    'Bicycle', 'Bin', 'Plastic Tubs', 'Ironing Board', 'Rugs', 'Carpets', 'Internal Doors',
    'External Doors', 'Wall Frame', 'Mirrors', 'Bathroom Equipment'
  ]},
  { value: 'equipment', label: 'Equipment', items: [
    'Tool Box', 'Air Compressor', 'Generator', 'Solar Panel', 'Water Pump', 'Pool Pump',
    'Heater', 'Air Conditioner'
  ]},
  { value: 'containers', label: 'Containers & Bags', items: [
    'Boxes', 'Bags', 'Suitcase', 'Pallets', 'Amazon Bag', 'China Bags'
  ]},
  { value: 'construction', label: 'Construction', items: [
    'Building Materials', 'Home Deco'
  ]},
  { value: 'other', label: 'Other', items: ['Other']}
];

const customQuoteSchema = z.object({
  phoneNumber: z.string().min(10, { message: "Valid phone number is required" }),
  category: z.string().min(1, { message: "Category is required" }),
  item: z.string().min(1, { message: "Item selection is required" }),
  description: z.string().min(5, { message: "Description must be at least 5 characters" }).optional(),
});

const CustomQuoteForm: React.FC<CustomQuoteFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [phoneNumber, setPhoneNumber] = useState(initialData?.senderDetails?.phone || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryItems, setCategoryItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(customQuoteSchema),
    defaultValues: {
      phoneNumber: initialData?.senderDetails?.phone || '',
      category: '',
      item: '',
      description: ''
    }
  });

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    const category = itemCategories.find(cat => cat.value === value);
    setCategoryItems(category?.items || []);
    setSelectedItem('');
    form.setValue('category', value);
    form.setValue('item', '');
  };

  const handleItemChange = (value: string) => {
    setSelectedItem(value);
    form.setValue('item', value);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = async (formData: any) => {
    if (!selectedCategory || !selectedItem) {
      toast({
        title: "Missing information",
        description: "Please select a category and item type.",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    
    try {
      const urls: string[] = [];
      
      if (images.length > 0) {
        for (const file of images) {
          const fileName = `${Date.now()}-${file.name}`;
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
      
      const finalDescription = selectedItem === 'Other' && description
        ? description
        : `${selectedCategory} - ${selectedItem}`;
      
      onSubmit({
        phoneNumber: formData.phoneNumber,
        category: selectedCategory,
        description: finalDescription,
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
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
      <div className="mb-6 p-4 border-l-4 border-blue-500 bg-blue-50">
        <h3 className="font-semibold text-blue-800 mb-2">How Custom Quotes Work</h3>
        <ol className="list-decimal ml-5 space-y-2">
          <li>Select the category and item you want to ship</li>
          <li>Provide your phone number so we can contact you with the quote</li>
          <li>Upload photos of your item(s) to help us provide an accurate quote</li>
          <li>Submit your request and our team will contact you within 24 hours</li>
        </ol>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Category *</FormLabel>
                  <Select 
                    onValueChange={(value) => handleCategoryChange(value)}
                    value={selectedCategory}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {itemCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedCategory && (
              <FormField
                control={form.control}
                name="item"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Item *</FormLabel>
                    <Select 
                      onValueChange={(value) => handleItemChange(value)}
                      value={selectedItem}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryItems.map(item => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          
          {selectedItem === 'Other' && (
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your item in detail including dimensions, weight if known, and any other relevant information"
                      className="resize-none"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+44 7123 456789"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  We'll call you on this number with your quote
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Images
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-zim-green hover:text-zim-green/80 focus-within:outline-none"
                  >
                    <span>Upload files</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleImageChange}
                      accept="image/*"
                      multiple
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
            
            {images.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700">Selected files:</p>
                <ul className="mt-1 text-sm text-gray-500 list-disc ml-5">
                  {images.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
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
              disabled={uploading || !form.formState.isValid || !selectedCategory || !selectedItem}
              className="bg-zim-green hover:bg-zim-green/90"
            >
              {uploading ? 'Uploading...' : 'Submit Quote Request'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CustomQuoteForm;
