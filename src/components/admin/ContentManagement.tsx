
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Image, Upload, Trash, Edit, Plus, Loader2, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption: string;
  category: string;
  created_at: string;
}

const ContentManagement = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageCategory, setImageCategory] = useState('general');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();
  
  useEffect(() => {
    fetchGalleryImages();
  }, []);
  
  const fetchGalleryImages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setImages(data || []);
    } catch (error: any) {
      console.error('Error fetching gallery images:', error.message);
      toast({
        title: 'Error loading images',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
    }
  };
  
  const resetUploadForm = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageAlt('');
    setImageCaption('');
    setImageCategory('general');
    setShowUploadDialog(false);
  };
  
  const handleUploadImage = async () => {
    if (!imageFile) return;
    
    try {
      setUploadLoading(true);
      
      // Upload the image to storage
      const fileName = `gallery-${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(`gallery/${fileName}`, imageFile);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: urlData } = await supabase.storage
        .from('images')
        .getPublicUrl(`gallery/${fileName}`);
        
      // Add the image to the gallery table
      const { error: insertError } = await supabase
        .from('gallery')
        .insert([
          {
            src: urlData.publicUrl,
            alt: imageAlt,
            caption: imageCaption,
            category: imageCategory
          }
        ]);
        
      if (insertError) throw insertError;
      
      toast({
        title: 'Image Uploaded',
        description: 'The image has been successfully added to the gallery.',
      });
      
      // Refresh the gallery images
      fetchGalleryImages();
      resetUploadForm();
      
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploadLoading(false);
    }
  };
  
  const handleDeleteImage = async (id: string) => {
    try {
      // Note: In a real application, we would also delete the image from storage
      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: 'Image Deleted',
        description: 'The image has been removed from the gallery.',
      });
      
      // Update the local state
      setImages(images.filter(img => img.id !== id));
      
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  
  // Get unique categories for filtering
  const categories = ['all', ...new Set(images.map(img => img.category))];
  
  // Filter images based on selected category
  const filteredImages = categoryFilter === 'all' 
    ? images 
    : images.filter(img => img.category === categoryFilter);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Media Library</h2>
          <p className="text-gray-500">Manage images for your website gallery</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => setShowUploadDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Image</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-zim-green" />
        </div>
      ) : filteredImages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredImages.map((image) => (
            <Card key={image.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img 
                  src={image.src} 
                  alt={image.alt} 
                  className="object-cover w-full h-full"
                />
                <div className="absolute bottom-0 right-0 p-2 flex space-x-1">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDeleteImage(image.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="font-medium truncate">{image.alt}</p>
                    <p className="text-sm text-gray-500 truncate">{image.caption}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                      {image.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(image.created_at)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[300px] space-y-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Image className="h-8 w-8 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">No Images Found</p>
                <p className="text-muted-foreground mb-4">
                  {categoryFilter === 'all' 
                    ? "Your media library is empty. Upload some images to get started." 
                    : `No images found in the "${categoryFilter}" category.`}
                </p>
                <Button onClick={() => setShowUploadDialog(true)}>Upload Media</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
            <DialogDescription>
              Add a new image to your media library.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-h-48 rounded-md object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    &times;
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-md p-12 text-center">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Click to select an image</p>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="image-upload" className="sr-only">Image</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={imagePreview ? "hidden" : ""}
              />
            </div>
            
            {imagePreview && (
              <>
                <div>
                  <Label htmlFor="alt-text">Alt Text</Label>
                  <Input
                    id="alt-text"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="Descriptive text for the image"
                  />
                </div>
                
                <div>
                  <Label htmlFor="caption">Caption</Label>
                  <Textarea
                    id="caption"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    placeholder="Optional caption"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={imageCategory} onValueChange={setImageCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="hero">Hero</SelectItem>
                      <SelectItem value="testimonial">Testimonial</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetUploadForm} disabled={uploadLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUploadImage}
              disabled={!imageFile || uploadLoading}
              className="bg-zim-green hover:bg-zim-green/90"
            >
              {uploadLoading ? (
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
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManagement;
