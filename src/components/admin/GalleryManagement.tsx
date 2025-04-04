import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GalleryImage, GalleryCategory } from '@/types/gallery';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Upload, Edit, Loader2, Image as ImageIcon, Plus } from 'lucide-react';
import { callRpcFunction } from '@/utils/supabaseUtils';

const galleryCategories = [
  { value: 'facilities', label: 'Facilities' },
  { value: 'shipments', label: 'Shipments' },
  { value: 'team', label: 'Our Team' },
  { value: 'customers', label: 'Customers' },
];

const GalleryManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newImage, setNewImage] = useState<Partial<GalleryImage>>({
    alt: '',
    caption: '',
    category: 'facilities',
  });

  const { data: galleryImages, isLoading } = useQuery({
    queryKey: ['adminGalleryImages'],
    queryFn: async () => {
      const { data, error } = await callRpcFunction<GalleryImage[]>('get_gallery_images');
      
      if (error) throw error;
      return data || [];
    }
  });

  const addImageMutation = useMutation({
    mutationFn: async (newImage: Partial<GalleryImage>) => {
      if (!uploadedFile) {
        throw new Error('No file uploaded');
      }

      setIsUploading(true);

      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, uploadedFile);

      if (uploadError) throw uploadError;

      const { data: publicURL } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      const { data, error: insertError } = await callRpcFunction<GalleryImage>('insert_gallery_image', {
        p_src: publicURL.publicUrl,
        p_alt: newImage.alt || '',
        p_caption: newImage.caption || '',
        p_category: newImage.category || 'facilities'
      });

      if (insertError) throw insertError;
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminGalleryImages'] });
      queryClient.invalidateQueries({ queryKey: ['galleryImages'] });
      toast({
        title: "Success!",
        description: "Image added to gallery",
      });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error adding image:', error);
      toast({
        title: "Error",
        description: "Failed to add image. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const imageToDelete = galleryImages?.find(img => img.id === imageId);
      if (!imageToDelete) throw new Error('Image not found');

      const fileUrl = imageToDelete.src;
      const fileName = fileUrl.split('/').pop();
      const filePath = `gallery/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from('public')
        .remove([filePath]);

      if (storageError) {
        console.warn('Error deleting file from storage:', storageError);
      }

      const { error: dbError } = await callRpcFunction<boolean>('delete_gallery_image', { 
        p_id: imageId 
      });

      if (dbError) throw dbError;

      return imageId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminGalleryImages'] });
      queryClient.invalidateQueries({ queryKey: ['galleryImages'] });
      toast({
        title: "Success!",
        description: "Image deleted from gallery",
      });
      setSelectedImage(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      toast({
        title: "No image selected",
        description: "Please upload an image",
        variant: "destructive",
      });
      return;
    }
    addImageMutation.mutate(newImage);
  };

  const confirmDelete = (image: GalleryImage) => {
    setSelectedImage(image);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteImage = () => {
    if (selectedImage?.id) {
      deleteImageMutation.mutate(selectedImage.id);
    }
  };

  const resetForm = () => {
    setNewImage({
      alt: '',
      caption: '',
      category: 'facilities',
    });
    setUploadedFile(null);
    setFilePreview(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Gallery Management</h2>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-zim-green hover:bg-zim-green/90"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Image
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-zim-green" />
        </div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            {galleryCategories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleryImages && galleryImages.length > 0 ? (
                galleryImages.map((image) => (
                  <GalleryImageCard 
                    key={image.id} 
                    image={image} 
                    onDelete={() => confirmDelete(image)} 
                  />
                ))
              ) : (
                <div className="col-span-full text-center p-12 bg-gray-50 rounded-lg">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium">No images found</h3>
                  <p className="mt-1 text-gray-500">Add your first gallery image to get started.</p>
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)} 
                    variant="outline" 
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Image
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {galleryCategories.map((category) => (
            <TabsContent key={category.value} value={category.value} className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {galleryImages && galleryImages.filter(img => img.category === category.value).length > 0 ? (
                  galleryImages
                    .filter(img => img.category === category.value)
                    .map((image) => (
                      <GalleryImageCard 
                        key={image.id} 
                        image={image} 
                        onDelete={() => confirmDelete(image)} 
                      />
                    ))
                ) : (
                  <div className="col-span-full text-center p-12 bg-gray-50 rounded-lg">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium">No {category.label} images</h3>
                    <p className="mt-1 text-gray-500">Add your first {category.label.toLowerCase()} image.</p>
                    <Button 
                      onClick={() => {
                        setNewImage(prev => ({ ...prev, category: category.value as GalleryCategory }));
                        setIsAddDialogOpen(true);
                      }} 
                      variant="outline" 
                      className="mt-4"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Image
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <AlertDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Gallery Image</AlertDialogTitle>
            <AlertDialogDescription>
              Upload a new image to add to the gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleAddImage} className="space-y-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="image-upload">Image</Label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 transition-colors hover:border-zim-green/50">
                {filePreview ? (
                  <div className="relative w-full">
                    <img src={filePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                    <Button 
                      type="button"
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={() => {
                        setUploadedFile(null);
                        setFilePreview(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click or drag & drop to upload</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
                  </>
                )}
                <Input 
                  id="image-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className={filePreview ? "hidden" : "opacity-0 absolute inset-0 w-full h-full cursor-pointer"}
                />
              </div>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={newImage.category} 
                onValueChange={(value) => setNewImage({...newImage, category: value as GalleryCategory})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {galleryCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="alt">Title</Label>
              <Input 
                id="alt" 
                placeholder="Enter a descriptive title" 
                value={newImage.alt} 
                onChange={(e) => setNewImage({...newImage, alt: e.target.value})}
                required
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="caption">Caption</Label>
              <Textarea 
                id="caption" 
                placeholder="Enter image caption" 
                value={newImage.caption} 
                onChange={(e) => setNewImage({...newImage, caption: e.target.value})}
                required
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button" onClick={resetForm}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                type="submit" 
                disabled={isUploading || !uploadedFile}
                className="bg-zim-green hover:bg-zim-green/90"
              >
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isUploading ? "Uploading..." : "Add Image"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the image 
              "{selectedImage?.alt}" from the gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteImage} 
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteImageMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface GalleryImageCardProps {
  image: GalleryImage;
  onDelete: () => void;
}

const GalleryImageCard: React.FC<GalleryImageCardProps> = ({ image, onDelete }) => {
  const categoryLabel = galleryCategories.find(cat => cat.value === image.category)?.label;
  
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video">
        <img 
          src={image.src} 
          alt={image.alt} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <Button 
            variant="destructive" 
            size="icon" 
            className="h-8 w-8 rounded-full bg-black/70 hover:bg-red-500"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="absolute bottom-2 left-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/70 text-white">
            {categoryLabel}
          </span>
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{image.alt}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{image.caption}</CardDescription>
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        {image.created_at && new Date(image.created_at).toLocaleDateString()}
      </CardFooter>
    </Card>
  );
};

export default GalleryManagement;
