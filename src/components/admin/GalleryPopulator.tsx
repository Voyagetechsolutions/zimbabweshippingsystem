
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, ImagePlus } from 'lucide-react';
import { galleryImages } from '@/data/galleryImagesData';
import { batchAddGalleryImages } from '@/utils/galleryHelpers';

const GalleryPopulator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ total: number; added: number } | null>(null);
  const { toast } = useToast();

  const handlePopulateGallery = async () => {
    try {
      setIsLoading(true);
      const addedImages = await batchAddGalleryImages(galleryImages);
      
      setResults({
        total: galleryImages.length,
        added: addedImages.length
      });
      
      toast({
        title: 'Gallery Updated',
        description: `Successfully added ${addedImages.length} images to the gallery.`,
      });
    } catch (error) {
      console.error('Error populating gallery:', error);
      toast({
        title: 'Error',
        description: 'Failed to populate gallery. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gallery Populator</CardTitle>
        <CardDescription>
          Add sample shipping images to the gallery with one click
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          This will add {galleryImages.length} shipping-related images to your gallery. These images
          showcase various aspects of the shipping process including facilities, operations, and team.
        </p>
        
        {results && (
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <h4 className="font-medium mb-1">Population Results:</h4>
            <p>Total images: {results.total}</p>
            <p>Successfully added: {results.added}</p>
            {results.added < results.total && (
              <p className="text-amber-600 text-sm mt-1">
                Note: Some images may have already existed in the gallery.
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handlePopulateGallery} 
          disabled={isLoading} 
          className="w-full bg-zim-green hover:bg-zim-green/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding Images...
            </>
          ) : (
            <>
              <ImagePlus className="mr-2 h-4 w-4" />
              Populate Gallery
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GalleryPopulator;
