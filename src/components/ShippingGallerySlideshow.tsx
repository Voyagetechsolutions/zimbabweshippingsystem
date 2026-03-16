import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, ImageOff, Play, Pause, X, ZoomIn } from 'lucide-react';
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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

  // Auto-play slideshow (pause when lightbox is open)
  useEffect(() => {
    if (images.length === 0 || isHovering || isLightboxOpen) return;

    let interval: NodeJS.Timeout | null = null;

    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPlaying, images.length, isHovering, isLightboxOpen]);

  // Handle keyboard navigation in lightbox
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isLightboxOpen) return;

    if (e.key === 'Escape') {
      setIsLightboxOpen(false);
    } else if (e.key === 'ArrowLeft') {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    } else if (e.key === 'ArrowRight') {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }
  }, [isLightboxOpen, images.length]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLightboxOpen]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  const openLightbox = () => {
    setIsLightboxOpen(true);
    setIsAutoPlaying(false);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
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
    <>
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
                    {/* Clickable Image */}
                    <button
                      onClick={openLightbox}
                      className="w-full h-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                      aria-label="Open image in fullscreen"
                    >
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  </div>
                ))}

                {/* Category Badge */}
                {currentImage.category && (
                  <div className="absolute top-4 left-4 z-10 pointer-events-none">
                    <span className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full uppercase tracking-wide shadow-lg">
                      {currentImage.category}
                    </span>
                  </div>
                )}

                {/* Image Counter & Zoom Hint */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                  <button
                    onClick={openLightbox}
                    className="p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <span className="px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                    {currentIndex + 1} / {images.length}
                  </span>
                </div>

                {/* Caption Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10 pointer-events-none">
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
                <div className={`absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 transition-opacity duration-300 z-20 ${isHovering ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
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

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-50 p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 z-50">
            <span className="px-4 py-2 bg-black/50 backdrop-blur-sm text-white text-sm font-medium rounded-full">
              {currentIndex + 1} / {images.length}
            </span>
          </div>

          {/* Main Image */}
          <div
            className="relative w-full h-full flex items-center justify-center p-4 md:p-12"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage.src}
              alt={currentImage.alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />

            {/* Caption */}
            <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-12 md:right-12 text-center">
              <div className="inline-block bg-black/70 backdrop-blur-sm rounded-xl px-6 py-4 max-w-2xl">
                {currentImage.category && (
                  <span className="inline-block px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full uppercase tracking-wide mb-2">
                    {currentImage.category}
                  </span>
                )}
                <h3 className="text-lg md:text-xl font-bold text-white">
                  {currentImage.alt}
                </h3>
                {currentImage.caption && (
                  <p className="text-slate-300 text-sm mt-1">
                    {currentImage.caption}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-all hover:scale-110"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-all hover:scale-110"
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          {/* Thumbnail Strip in Lightbox */}
          <div className="absolute bottom-20 md:bottom-24 left-0 right-0 overflow-x-auto px-4">
            <div className="flex gap-2 justify-center">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleThumbnailClick(index);
                  }}
                  className={`relative flex-shrink-0 w-16 h-12 md:w-20 md:h-14 rounded-lg overflow-hidden transition-all duration-300 ${
                    index === currentIndex
                      ? "ring-2 ring-orange-500 scale-110"
                      : "opacity-50 hover:opacity-100"
                  }`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard Hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-500 text-xs hidden md:block">
            Use arrow keys to navigate, ESC to close
          </div>
        </div>
      )}
    </>
  );
};

export default ShippingGallerySlideshow;
