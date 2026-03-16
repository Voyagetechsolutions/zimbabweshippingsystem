import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, ImageOff, Play, Pause } from 'lucide-react';
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
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

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
    if (images.length === 0 || isHovering) return;

    let interval: NodeJS.Timeout | null = null;

    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPlaying, images.length, isHovering]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  // Loading state
  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium mb-4">
              Gallery
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Our Shipping Operations</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              See our team in action - from warehouse to delivery
            </p>
          </div>
          <div className="flex justify-center items-center" style={{ minHeight: '400px' }}>
            <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
          </div>
        </div>
      </section>
    );
  }

  // No images state
  if (images.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium mb-4">
              Gallery
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Our Shipping Operations</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              See our team in action - from warehouse to delivery
            </p>
          </div>
          <div className="flex flex-col justify-center items-center gap-4 py-20 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <ImageOff className="h-20 w-20 text-slate-600" />
            <p className="text-slate-500 text-lg">Gallery images coming soon</p>
          </div>
        </div>
      </section>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium mb-4">
            Gallery
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Our Shipping Operations</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            See our team in action - from warehouse to delivery
          </p>
        </div>

        {/* Main Gallery Container */}
        <div className="max-w-6xl mx-auto">
          {/* Main Image Display */}
          <div
            className="relative rounded-2xl overflow-hidden bg-slate-800 shadow-2xl"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {/* Image Container */}
            <div className="relative aspect-[16/9] md:aspect-[21/9]">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                    index === currentIndex
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-105"
                  }`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
              ))}

              {/* Category Badge */}
              {currentImage.category && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full uppercase tracking-wide shadow-lg">
                    {currentImage.category}
                  </span>
                </div>
              )}

              {/* Image Counter */}
              <div className="absolute top-4 right-4 z-10">
                <span className="px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                  {currentIndex + 1} / {images.length}
                </span>
              </div>

              {/* Caption Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                  {currentImage.alt}
                </h3>
                {currentImage.caption && (
                  <p className="text-slate-300 text-sm md:text-base max-w-2xl">
                    {currentImage.caption}
                  </p>
                )}
              </div>

              {/* Navigation Arrows */}
              <div className={`absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
                <Button
                  onClick={handlePrev}
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 rounded-full border border-white/20 transition-all hover:scale-110"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  onClick={handleNext}
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 rounded-full border border-white/20 transition-all hover:scale-110"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="mt-6 flex items-center justify-between">
            {/* Playback Control */}
            <Button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {isAutoPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </>
              )}
            </Button>

            {/* Progress Dots */}
            <div className="flex items-center gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleThumbnailClick(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "w-8 bg-orange-500"
                      : "w-2 bg-slate-600 hover:bg-slate-500"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Image count on mobile */}
            <span className="text-slate-500 text-sm">
              {images.length} photos
            </span>
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="mt-6 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex gap-3 min-w-max">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => handleThumbnailClick(index)}
                    className={`relative flex-shrink-0 w-24 h-16 md:w-32 md:h-20 rounded-lg overflow-hidden transition-all duration-300 ${
                      index === currentIndex
                        ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-slate-900 scale-105"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                    />
                    {index === currentIndex && (
                      <div className="absolute inset-0 bg-orange-500/20" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ShippingGallerySlideshow;
