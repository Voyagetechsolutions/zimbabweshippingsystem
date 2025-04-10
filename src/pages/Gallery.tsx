
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { GalleryImage, GalleryCategory, GalleryCategoryInfo } from '@/types/gallery';
import { useToast } from '@/hooks/use-toast';
import { Image as ImageIcon, Loader } from 'lucide-react';
import { callRpcFunction } from '@/utils/supabaseUtils';

const Gallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<GalleryCategory | 'all'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchGalleryImages();
  }, []);

  const fetchGalleryImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await callRpcFunction('get_gallery_images');
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Properly cast the result to GalleryImage[]
        setImages(data as unknown as GalleryImage[]);
      }
    } catch (error: any) {
      console.error('Error fetching gallery images:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to load gallery images. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredImages = activeCategory === 'all' 
    ? images 
    : images.filter(image => image.category === activeCategory);

  const categories: { value: GalleryCategory | 'all'; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: 'images' },
    { value: 'facilities', label: 'Our Facilities', icon: 'building' },
    { value: 'shipments', label: 'Shipments', icon: 'package' },
    { value: 'team', label: 'Our Team', icon: 'users' },
    { value: 'customers', label: 'Happy Customers', icon: 'heart' },
  ];

  return (
    <div className="min-h-screen flex flex-col w-full">
      <Navbar />
      <main className="flex-grow py-8 px-4 md:px-8 w-full">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Our Gallery</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Take a visual journey through our shipping operations, facilities, team, and satisfied customers.
            </p>
          </div>

          <Tabs defaultValue="all" value={activeCategory} onValueChange={(value) => setActiveCategory(value as GalleryCategory | 'all')}>
            <div className="flex justify-center mb-8 overflow-x-auto w-full">
              <TabsList className="bg-gray-100 p-1 overflow-x-auto flex-wrap justify-center">
                {categories.map((category) => (
                  <TabsTrigger 
                    key={category.value} 
                    value={category.value}
                    className="px-4 py-2 data-[state=active]:bg-white rounded-md"
                  >
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value={activeCategory} className="mt-0">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader className="h-12 w-12 animate-spin text-gray-400" />
                </div>
              ) : filteredImages.length > 0 ? (
                <div className="space-y-12">
                  {activeCategory === 'all' && (
                    <Carousel className="w-full max-w-5xl mx-auto mb-12">
                      <CarouselContent>
                        {images.slice(0, 5).map((image) => (
                          <CarouselItem key={`carousel-${image.id}`} className="md:basis-1/2 lg:basis-1/3">
                            <div className="p-1">
                              <div className="overflow-hidden rounded-lg shadow-md">
                                <div className="relative aspect-w-4 aspect-h-3">
                                  <img 
                                    src={image.src} 
                                    alt={image.alt} 
                                    className="object-cover w-full h-64 transition-transform duration-300 hover:scale-105"
                                  />
                                </div>
                                <div className="p-4 bg-white">
                                  <p className="text-gray-800 font-medium">{image.caption}</p>
                                  <p className="text-gray-500 text-sm mt-1 capitalize">{image.category}</p>
                                </div>
                              </div>
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="left-0" />
                      <CarouselNext className="right-0" />
                    </Carousel>
                  )}
                
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredImages.map((image) => (
                      <div 
                        key={image.id} 
                        className="overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
                      >
                        <div className="relative aspect-w-4 aspect-h-3">
                          <img 
                            src={image.src} 
                            alt={image.alt} 
                            className="object-cover w-full h-64 transition-transform duration-300 hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-4 bg-white">
                          <p className="text-gray-800 font-medium">{image.caption}</p>
                          <p className="text-gray-500 text-sm mt-1 capitalize">{image.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <ImageIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-medium text-gray-600 mb-2">No images found</h3>
                  <p className="text-gray-500">
                    {activeCategory === 'all' 
                      ? "There are no gallery images available yet." 
                      : `There are no images in the ${activeCategory} category yet.`}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Gallery;
