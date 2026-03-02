import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption: string;
  category: string;
}

const ShippingGallerySlideshow: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Fetch images from the gallery table
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching gallery images:', error.message);
        } else {
          setImages(data || []);
        }
      } catch (err) {
        console.error('Error fetching gallery images:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Auto-play slideshow
  useEffect(() => {
    if (images.length === 0) return;

    let interval: NodeJS.Timeout | null = null;

    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 4000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPlaying, images.length]);

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  // Loading state
  if (loading) {
    return (
      <section className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">Our Shipping Operations</h2>
          <div className="flex justify-center items-center" style={{ minHeight: '400px' }}>
            <Loader2 className="h-10 w-10 animate-spin text-white/60" />
          </div>
        </div>
      </section>
    );
  }

  // No images state
  if (images.length === 0) {
    return (
      <section className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">Our Shipping Operations</h2>
          <div className="flex flex-col justify-center items-center gap-4" style={{ minHeight: '300px' }}>
            <ImageOff className="h-16 w-16 text-white/30" />
            <p className="text-white/50 text-lg">Gallery images coming soon</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-gray-900 text-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">Our Shipping Operations</h2>

        <div className="relative max-w-5xl mx-auto">
          {/* Slideshow container */}
          <div className="aspect-w-16 aspect-h-9 bg-gray-800 overflow-hidden rounded-lg" style={{ minHeight: '400px', height: 'calc(50vh)' }}>
            {images.map((image, index) => (
              <div
                key={image.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? "opacity-100" : "opacity-0"
                  }`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="object-contain w-full h-full"
                  style={{ maxHeight: '100%', margin: '0 auto' }}
                  onLoad={handleImageLoad}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-4 text-white">
                  <p className="text-sm md:text-base">{image.alt}</p>
                </div>
              </div>
            ))}

            <div className="absolute inset-0 flex items-center justify-between px-4">
              <Button
                onClick={handlePrev}
                variant="ghost"
                size="icon"
                className="bg-black/30 text-white hover:bg-black/50 rounded-full"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                onClick={handleNext}
                variant="ghost"
                size="icon"
                className="bg-black/30 text-white hover:bg-black/50 rounded-full"
                aria-label="Next image"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            {images.map((image, index) => (
              <button
                key={image.id}
                className={`w-3 h-3 mx-1 rounded-full ${index === currentIndex ? "bg-white" : "bg-gray-500"
                  }`}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsAutoPlaying(false);
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShippingGallerySlideshow;
