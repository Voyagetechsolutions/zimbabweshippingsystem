import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, FileImage, Filter, MoreHorizontal, Plus, RefreshCw, Search, Trash, Upload, X } from 'lucide-react';
import { GalleryImage, GalleryCategory } from '@/types/gallery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Json } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { callRpcFunction } from '@/utils/supabaseUtils';
import GalleryPopulator from '@/components/admin/GalleryPopulator';

const GalleryAdmin = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [formData, setFormData] = useState({
    src: '',
    alt: '',
    caption: '',
    category: 'facilities' as GalleryCategory,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchGalleryImages();
  }, []);

  const fetchGalleryImages = async () => {
    try {
      setIsLoading(true);
      
      // Use the RPC function instead of directly accessing the gallery table
      const { data, error } = await callRpcFunction('get_gallery_images');
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Properly cast the Json[] to GalleryImage[]
        setImages(data as unknown as GalleryImage[]);
      }
    } catch (error: any) {
      console.error('Error fetching gallery images:', error);
      toast({
        title: 'Error',
        description: 'Failed to load gallery images. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setIsEditing(false);
    setSelectedImage(null);
    setFormData({
      src: '',
      alt: '',
      caption: '',
      category: 'facilities',
    });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value as GalleryCategory }));
  };

  const handleEditImage = (image: GalleryImage) => {
    setIsEditing(true);
    setSelectedImage(image);
    setFormData({
      src: image.src,
      alt: image.alt,
      caption: image.caption,
      category: image.category,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteImage = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this image?");
    if (!confirmDelete) return;

    try {
      setIsLoading(true);
      // Use the RPC function to delete the image
      const { data, error } = await callRpcFunction('delete_gallery_image', { p_id: id });

      if (error) {
        throw error;
      }

      // Check if the deletion was successful
      if (data) {
        // Remove the deleted image from the state
        setImages(prevImages => prevImages.filter(image => image.id !== id));
        toast({
          title: 'Success',
          description: 'Image deleted successfully.',
        });
      } else {
        throw new Error('Failed to delete image');
      }
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isEditing && selectedImage) {
        // For editing, we need to use a direct approach since there's no RPC for updating
        // This is where we might need to handle things differently in the future
        const { data: updatedData, error: updateError } = await callRpcFunction('update_gallery_image', {
          p_id: selectedImage.id,
          p_src: formData.src,
          p_alt: formData.alt,
          p_caption: formData.caption,
          p_category: formData.category
        });

        if (updateError) {
          throw updateError;
        }

        // Refresh the gallery images
        await fetchGalleryImages();
        
        toast({
          title: 'Success',
          description: 'Image updated successfully.',
        });
      } else {
        // For insertion, use the insert_gallery_image RPC function
        const { data: newImage, error: insertError } = await callRpcFunction('insert_gallery_image', {
          p_src: formData.src,
          p_alt: formData.alt,
          p_caption: formData.caption,
          p_category: formData.category
        });

        if (insertError) {
          throw insertError;
        }

        // Refresh the gallery images
        await fetchGalleryImages();

        toast({
          title: 'Success',
          description: 'Image added successfully.',
        });
      }
    } catch (error: any) {
      console.error('Error adding/updating image:', error);
      toast({
        title: 'Error',
        description: 'Failed to add/update image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      handleCloseDialog();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast({
        title: 'Error',
        description: 'No file selected.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const fileName = `gallery_${timestamp}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Construct the public URL for the uploaded file
      const imageUrl = `https://oncsaunsqtekwwbzvvyh.supabase.co/storage/v1/object/public/images/${filePath}`;
      setFormData(prev => ({ ...prev, src: imageUrl }));
      toast({
        title: 'Success',
        description: 'File uploaded successfully.',
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredImages = images.filter(image => {
    const searchRegex = new RegExp(searchQuery, 'i');
    const matchesSearch = searchRegex.test(image.alt) || searchRegex.test(image.caption);

    const matchesCategory = filterCategory === 'all' || image.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const categories: { value: GalleryCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'facilities', label: 'Our Facilities' },
    { value: 'shipments', label: 'Shipments' },
    { value: 'team', label: 'Our Team' },
    { value: 'customers', label: 'Happy Customers' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Gallery Management</CardTitle>
                  <CardDescription>Manage and organize images in the gallery</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
                    <Input
                      type="text"
                      placeholder="Search images..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    <Select value={filterCategory} onValueChange={value => setFilterCategory(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleOpenDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Image
                    </Button>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <RefreshCw className="h-12 w-12 animate-spin text-gray-400" />
                    </div>
                  ) : filteredImages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredImages.map(image => (
                        <div key={image.id} className="relative">
                          <img
                            src={image.src}
                            alt={image.alt}
                            className="object-cover w-full h-48 rounded-md shadow-md"
                          />
                          <div className="absolute top-2 right-2 flex space-x-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEditImage(image)}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDeleteImage(image.id || '')}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="mt-2">
                            <p className="text-gray-800 font-medium">{image.caption}</p>
                            <Badge variant="secondary" className="mt-1">{image.category}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <FileImage className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-medium text-gray-600 mb-2">No images found</h3>
                      <p className="text-gray-500">
                        {searchQuery
                          ? "No images match your search criteria."
                          : "There are no gallery images available yet."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <GalleryPopulator />
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Gallery Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex">
                      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-amber-500" />
                      <span>For best display, use images with a 4:3 or 16:9 aspect ratio</span>
                    </li>
                    <li className="flex">
                      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-amber-500" />
                      <span>Optimize images before uploading for faster loading</span>
                    </li>
                    <li className="flex">
                      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-amber-500" />
                      <span>Write descriptive alt text to improve accessibility</span>
                    </li>
                    <li className="flex">
                      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-amber-500" />
                      <span>Keep captions concise and informative</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Image' : 'Add Image'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the image details.' : 'Upload a new image to the gallery.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="src" className="text-right">
                Image URL
              </Label>
              <Input
                id="src"
                name="src"
                value={formData.src}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="upload" className="text-right">
                Upload Image
              </Label>
              <Input
                type="file"
                id="upload"
                name="upload"
                onChange={handleFileUpload}
                className="col-span-3 hidden"
                ref={fileInputRef}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="col-span-3 justify-start">
                <Upload className="mr-2 h-4 w-4" />
                {formData.src ? 'Change File' : 'Upload File'}
              </Button>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="alt" className="text-right">
                Alt Text
              </Label>
              <Input
                id="alt"
                name="alt"
                value={formData.alt}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="caption" className="text-right mt-2">
                Caption
              </Label>
              <Textarea
                id="caption"
                name="caption"
                value={formData.caption}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select value={formData.category} onValueChange={handleSelectChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(cat => cat.value !== 'all').map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  Saving...
                </>
              ) : (
                isEditing ? 'Update Image' : 'Add Image'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryAdmin;
