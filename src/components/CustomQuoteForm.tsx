
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, X, Image as ImageIcon, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomQuoteFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const CustomQuoteForm: React.FC<CustomQuoteFormProps> = ({
  initialData,
  onSubmit,
  onCancel
}) => {
  const [description, setDescription] = useState<string>(initialData?.shipmentDetails?.description || '');
  const [category, setCategory] = useState<string>(initialData?.shipmentDetails?.category || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(initialData?.senderDetails?.phone || '');
  const [uploads, setUploads] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    description?: string;
    category?: string;
    phoneNumber?: string;
  }>({});
  const { toast } = useToast();
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    
    // Convert FileList to array and filter for image files
    const newFiles = Array.from(fileList).filter(file => 
      file.type.startsWith('image/') && file.size < 10 * 1024 * 1024 // Less than 10MB
    );
    
    if (newFiles.length < fileList.length) {
      toast({
        title: "Some files were not added",
        description: "Only image files under 10MB are accepted.",
        variant: "destructive",
      });
    }
    
    setUploads([...uploads, ...newFiles]);
  };
  
  const removeFile = (index: number) => {
    const newFiles = [...uploads];
    newFiles.splice(index, 1);
    setUploads(newFiles);
  };

  const validateForm = (): boolean => {
    const errors: {
      description?: string;
      category?: string;
      phoneNumber?: string;
    } = {};

    if (!description.trim()) {
      errors.description = "Please provide a description of your item";
    }

    if (!category) {
      errors.category = "Please select a category";
    }

    if (!phoneNumber.trim()) {
      errors.phoneNumber = "Please provide a contact phone number";
    } else if (!/^\+?[0-9\s\-()]{8,20}$/.test(phoneNumber.trim())) {
      errors.phoneNumber = "Please enter a valid phone number";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Upload any images first
      const uploadedImageUrls = [...uploadedFiles];
      
      if (uploads.length > 0) {
        for (const file of uploads) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { error: uploadError, data } = await supabase.storage
            .from('custom-quotes')
            .upload(fileName, file);
          
          if (uploadError) {
            throw new Error(`Error uploading file: ${uploadError.message}`);
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('custom-quotes')
            .getPublicUrl(fileName);
          
          uploadedImageUrls.push(publicUrl);
        }
      }
      
      const quoteData = {
        description,
        category,
        phoneNumber,
        imageUrls: uploadedImageUrls
      };
      
      onSubmit(quoteData);
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Request Custom Quote</h3>
      <p className="text-gray-600 mb-6">
        Please provide details about the items you want to ship so we can give you an accurate quote.
      </p>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="category" className={validationErrors.category ? "text-destructive" : ""}>
            Item Category*
          </Label>
          <Select 
            value={category} 
            onValueChange={(value) => {
              setCategory(value);
              setValidationErrors(prev => ({ ...prev, category: undefined }));
            }}
          >
            <SelectTrigger className={validationErrors.category ? "border-destructive" : ""}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="furniture">Furniture</SelectItem>
              <SelectItem value="appliances">Appliances</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="vehicles">Vehicle Parts</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.category && (
            <p className="text-destructive text-sm mt-1">{validationErrors.category}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="description" className={validationErrors.description ? "text-destructive" : ""}>
            Description*
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setValidationErrors(prev => ({ ...prev, description: undefined }));
            }}
            placeholder="Please describe your item including dimensions and weight if possible"
            rows={5}
            className={validationErrors.description ? "border-destructive" : ""}
            required
          />
          {validationErrors.description && (
            <p className="text-destructive text-sm mt-1">{validationErrors.description}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="phoneNumber" className={validationErrors.phoneNumber ? "text-destructive" : ""}>
            Contact Phone Number*
          </Label>
          <Input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              setValidationErrors(prev => ({ ...prev, phoneNumber: undefined }));
            }}
            placeholder="Enter your phone number"
            className={validationErrors.phoneNumber ? "border-destructive" : ""}
            required
          />
          {validationErrors.phoneNumber && (
            <p className="text-destructive text-sm mt-1">{validationErrors.phoneNumber}</p>
          )}
        </div>
        
        <div>
          <Label className="block mb-2">Upload Images (Optional)</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="imageUpload"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <label 
              htmlFor="imageUpload" 
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Click to upload images</p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
            </label>
          </div>
          
          {uploads.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {uploads.map((file, index) => (
                <div key={index} className="relative rounded-md border overflow-hidden group">
                  <div className="w-full h-20 bg-gray-100 flex items-center justify-center">
                    {file.type.startsWith('image/') ? (
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4 text-gray-700" />
                  </button>
                  <div className="text-xs truncate py-1 px-2 bg-gray-50">
                    {file.name}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Previously Uploaded Images</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {uploadedFiles.map((url, index) => (
                  <div key={index} className="relative rounded-md border overflow-hidden">
                    <div className="w-full h-20 bg-gray-100">
                      <img 
                        src={url} 
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-1 right-1 bg-green-100 rounded-full p-0.5 text-green-600">
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Back
          </Button>
          
          <Button 
            type="submit" 
            className="bg-zim-green hover:bg-zim-green/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : 'Submit Quote Request'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default CustomQuoteForm;
