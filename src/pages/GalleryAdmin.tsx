
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  UploadCloud, 
  Edit,
  Check,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GalleryImage, GalleryCategory } from '@/types/gallery';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const GalleryAdmin = () => {
  const { isAdmin } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  // Form state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageCategory, setImageCategory] = useState<GalleryCategory>('facilities');

  const { toast } = useToast();

  // Categories for gallery images
  const categories: { value: GalleryCategory; label: string }[] = [
    { value: 'facilities', label: 'Our Facilities' },
    { value: 'shipments', label: 'Shipments' },
    { value: 'team', label: 'Our Team' },
    { value: 'customers', label: 'Happy Customers' },
  ];

  useEffect(() => {
    fetchGalleryImages();
  }, []);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchGalleryImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_gallery_images');
      
      if (error) throw error;
      
      if (data) {
        setImages(data as GalleryImage[]);
      }
    } catch (error: any) {
      console.error('Error fetching gallery images:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to load gallery images. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageFile) {
      toast({
        title: 'Error',
        description: 'Please select an image to upload.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!imageAlt || !imageCaption || !imageCategory) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setUploading(true);
      
      // Upload the image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `gallery/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, imageFile);
      
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      // Save the image info to the database
      const { data: insertData, error: insertError } = await supabase.rpc(
        'insert_gallery_image',
        {
          p_src: urlData.publicUrl,
          p_alt: imageAlt,
          p_caption: imageCaption,
          p_category: imageCategory
        }
      );
      
      if (insertError) throw insertError;
      
      toast({
        title: 'Success',
        description: 'Gallery image uploaded successfully.',
      });
      
      // Refresh gallery images
      fetchGalleryImages();
      
      // Reset form
      setImageFile(null);
      setImagePreview(null);
      setImageAlt('');
      setImageCaption('');
      setImageCategory('facilities');
      
      // Reset file input
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error: any) {
      console.error('Error uploading image:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete) return;
    
    try {
      const { data, error } = await supabase.rpc(
        'delete_gallery_image',
        { p_id: imageToDelete }
      );
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Gallery image deleted successfully.',
      });
      
      // Refresh gallery images
      fetchGalleryImages();
      
      // Close dialog
      setDialogOpen(false);
      setImageToDelete(null);
      
    } catch (error: any) {
      console.error('Error deleting image:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to delete image. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-10 max-w-7xl">
          <h1 className="text-3xl font-bold mb-2">Gallery Administration</h1>
          <p className="text-gray-600 mb-6">
            Manage gallery images for the website.
          </p>
          <Separator className="my-6" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Image</CardTitle>
                  <CardDescription>Upload images to display on the gallery page</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="image-upload">Image</Label>
                        <div 
                          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center ${
                            imagePreview ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                          } transition-colors duration-200`}
                        >
                          {imagePreview ? (
                            <div className="space-y-2">
                              <img 
                                src={imagePreview} 
                                alt="Preview" 
                                className="max-h-48 mx-auto rounded-md" 
                              />
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setImageFile(null);
                                  setImagePreview(null);
                                  const fileInput = document.getElementById('image-upload') as HTMLInputElement;
                                  if (fileInput) fileInput.value = '';
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Remove Image
                              </Button>
                            </div>
                          ) : (
                            <>
                              <UploadCloud className="h-12 w-12 text-gray-400 mb-2" />
                              <div className="text-sm text-gray-600 mb-2">
                                <label 
                                  htmlFor="image-upload"
                                  className="font-medium text-zim-green hover:text-zim-green/90 cursor-pointer"
                                >
                                  Click to upload
                                </label>
                                {' '}or drag and drop
                              </div>
                              <p className="text-xs text-gray-500">
                                PNG, JPG, GIF up to 10MB
                              </p>
                            </>
                          )}
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="alt">Alt Text</Label>
                        <Input
                          id="alt"
                          placeholder="Description for screen readers"
                          value={imageAlt}
                          onChange={(e) => setImageAlt(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="caption">Caption</Label>
                        <Textarea
                          id="caption"
                          placeholder="Image caption"
                          value={imageCaption}
                          onChange={(e) => setImageCaption(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={imageCategory}
                          onValueChange={(value: GalleryCategory) => setImageCategory(value)}
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full mt-6 bg-zim-green hover:bg-zim-green/90"
                      disabled={uploading || !imageFile}
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Gallery
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Gallery Images</CardTitle>
                  <CardDescription>Manage existing images in the gallery</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
                    </div>
                  ) : images.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {images.map((image) => (
                        <Card key={image.id} className="overflow-hidden">
                          <div className="aspect-w-16 aspect-h-9 relative">
                            <img 
                              src={image.src} 
                              alt={image.alt} 
                              className="object-cover w-full h-full"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 opacity-90"
                              onClick={() => {
                                setImageToDelete(image.id);
                                setDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <CardFooter className="flex flex-col items-start pt-4 pb-4 px-4">
                            <p className="font-medium text-sm mb-1 line-clamp-1">{image.caption}</p>
                            <div className="flex items-center justify-between w-full">
                              <Badge variant="secondary" className="capitalize text-xs">
                                {image.category}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(image.created_at || '').toLocaleDateString()}
                              </span>
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <h3 className="text-lg font-medium text-gray-600 mb-1">No images yet</h3>
                      <p className="text-gray-500 mb-4">
                        Upload your first image to get started with the gallery.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Delete Confirmation Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p>Are you sure you want to delete this image from the gallery? This action cannot be undone.</p>
              </div>
              <DialogFooter className="flex flex-row justify-end gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteImage}>
                  Delete Image
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GalleryAdmin;
