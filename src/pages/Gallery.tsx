
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ImageIcon,
  Truck,
  Package,
  UserCheck,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import { GalleryImage, GalleryCategory } from '@/types/gallery';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const GalleryPage = () => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentCategory, setCurrentCategory] = useState<GalleryCategory>('facilities');

  // Fetch gallery images from Supabase
  const { data: galleryImages, isLoading, error } = useQuery({
    queryKey: ['galleryImages'],
    queryFn: async () => {
      // Use RPC function instead of direct table access
      const { data, error } = await supabase
        .rpc('get_gallery_images')
        .then(response => {
          if (response.error) throw response.error;
          return response;
        });
      
      if (error) throw error;
      return (data || []) as GalleryImage[];
    }
  });

  // Group images by category
  const imagesByCategory = galleryImages?.reduce((acc, image) => {
    if (!acc[image.category]) {
      acc[image.category] = [];
    }
    acc[image.category].push(image);
    return acc;
  }, {} as Record<GalleryCategory, GalleryImage[]>) || {};

  // Fallback data for development and when no images are available
  const fallbackImages: Record<GalleryCategory, GalleryImage[]> = {
    'facilities': [
      {
        src: 'https://images.unsplash.com/photo-1586528116493-a029325540b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'UK Warehouse Exterior',
        caption: 'Our UK warehouse in London',
        category: 'facilities'
      },
      {
        src: 'https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'UK Warehouse Interior',
        caption: 'Inside our UK sorting facility',
        category: 'facilities'
      },
      {
        src: 'https://images.unsplash.com/photo-1600880291319-1a7499c191e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Zimbabwe Office',
        caption: 'Our main office in Harare, Zimbabwe',
        category: 'facilities'
      },
      {
        src: 'https://images.unsplash.com/photo-1530979044213-d5c8b7acef87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Zimbabwe Facility',
        caption: 'Our distribution center in Zimbabwe',
        category: 'facilities'
      }
    ],
    'shipments': [
      {
        src: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Drums Ready for Shipping',
        caption: 'Drums prepared and ready for shipping',
        category: 'shipments'
      },
      {
        src: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Truck Loading',
        caption: 'Loading our shipments onto transport vehicles',
        category: 'shipments'
      },
      {
        src: 'https://images.unsplash.com/photo-1574345503133-9b326e895b05?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Parcels',
        caption: 'Parcels being prepared for shipping',
        category: 'shipments'
      },
      {
        src: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Ship Loading',
        caption: 'Container loading at the port',
        category: 'shipments'
      }
    ],
    'team': [
      {
        src: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Manager',
        caption: 'Our UK Operations Manager',
        category: 'team'
      },
      {
        src: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Customer Service',
        caption: 'Our dedicated customer service team',
        category: 'team'
      },
      {
        src: 'https://images.unsplash.com/photo-1524117074681-31bd4de22ad3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Logistics Team',
        caption: 'Our logistics specialists in action',
        category: 'team'
      },
      {
        src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Whole Team',
        caption: 'Our incredible team working together',
        category: 'team'
      }
    ],
    'customers': [
      {
        src: 'https://images.unsplash.com/photo-1559634759-0d3a737e2a5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Happy Customer',
        caption: 'One of our happy customers receiving their shipment',
        category: 'customers'
      },
      {
        src: 'https://images.unsplash.com/photo-1608508644127-ba99d7732fee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Family Receiving Shipment',
        caption: 'A family in Zimbabwe receiving their shipment',
        category: 'customers'
      },
      {
        src: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Business Customer',
        caption: 'One of our business customers in Harare',
        category: 'customers'
      },
      {
        src: 'https://images.unsplash.com/photo-1559624989-7b9303bd9792?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        alt: 'Customer Story',
        caption: 'Celebrating successful delivery with our customers',
        category: 'customers'
      }
    ]
  };
  
  // If no images are loaded from the database, use the fallback images
  const images = Object.keys(imagesByCategory).length === 0 || !imagesByCategory[currentCategory] 
    ? fallbackImages[currentCategory] 
    : imagesByCategory[currentCategory];
  
  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };
  
  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  };
  
  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    } else {
      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Photo Gallery
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                View our facilities, shipments, team, and customer stories
              </p>
              <div className="flex justify-center mt-6">
                <div className="h-1 w-20 bg-zim-green rounded-full mx-1"></div>
                <div className="h-1 w-20 bg-zim-yellow rounded-full mx-1"></div>
                <div className="h-1 w-20 bg-zim-red rounded-full mx-1"></div>
              </div>
            </div>
            
            <div className="mt-12">
              <Tabs 
                defaultValue="facilities" 
                onValueChange={(value) => setCurrentCategory(value as GalleryCategory)}
                className="w-full"
              >
                <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4">
                  <TabsTrigger value="facilities" className="flex flex-col items-center px-2 py-2 text-xs sm:text-sm">
                    <Warehouse className="h-4 w-4 mb-1" />
                    Facilities
                  </TabsTrigger>
                  <TabsTrigger value="shipments" className="flex flex-col items-center px-2 py-2 text-xs sm:text-sm">
                    <Truck className="h-4 w-4 mb-1" />
                    Shipments
                  </TabsTrigger>
                  <TabsTrigger value="team" className="flex flex-col items-center px-2 py-2 text-xs sm:text-sm">
                    <UserCheck className="h-4 w-4 mb-1" />
                    Our Team
                  </TabsTrigger>
                  <TabsTrigger value="customers" className="flex flex-col items-center px-2 py-2 text-xs sm:text-sm">
                    <Package className="h-4 w-4 mb-1" />
                    Customers
                  </TabsTrigger>
                </TabsList>
                
                {isLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-zim-green" />
                  </div>
                ) : (
                  Object.keys(fallbackImages).map((category) => (
                    <TabsContent key={category} value={category} className="mt-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {images.map((image, index) => (
                          <div 
                            key={index} 
                            className="rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
                            onClick={() => openLightbox(index)}
                          >
                            <div className="relative h-64 overflow-hidden">
                              <img 
                                src={image.src} 
                                alt={image.alt} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 flex items-center justify-center">
                                <ImageIcon className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 h-8 w-8" />
                              </div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800">
                              <p className="text-gray-900 dark:text-gray-100 font-medium">{image.alt}</p>
                              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{image.caption}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))
                )}
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      
      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:bg-white/10"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/10"
            onClick={() => navigateLightbox('prev')}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          
          <div className="max-w-4xl max-h-[80vh] w-full p-4">
            <img 
              src={images[currentImageIndex].src} 
              alt={images[currentImageIndex].alt} 
              className="max-w-full max-h-[70vh] mx-auto object-contain"
            />
            <div className="text-center mt-4 text-white">
              <h3 className="text-xl font-medium">{images[currentImageIndex].alt}</h3>
              <p className="text-gray-300 mt-1">{images[currentImageIndex].caption}</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/10"
            onClick={() => navigateLightbox('next')}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default GalleryPage;
