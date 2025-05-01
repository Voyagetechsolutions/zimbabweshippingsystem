
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const images = [
  {
    src: "public/lovable-uploads/5fac2a37-1652-4c06-8f85-d373c1e9ccd6.png",
    alt: "Industrial machinery being loaded into a shipping container"
  },
  {
    src: "public/lovable-uploads/87d356cd-e4fd-45cd-a049-81430ed045d8.png",
    alt: "Wrapped pallets in a warehouse"
  },
  {
    src: "public/lovable-uploads/14353843-5722-4925-ae94-9139b2b90e3b.png",
    alt: "Bicycles packed for shipping"
  },
  {
    src: "public/lovable-uploads/bb75a161-68c8-4e58-b4d4-976981bfc09d.png",
    alt: "Boxes and containers loaded in a delivery van"
  },
  {
    src: "public/lovable-uploads/f286a2cc-08fc-44f2-97d7-32aa9f8b7b29.png",
    alt: "Shipping drums and containers on a truck"
  },
  {
    src: "public/lovable-uploads/a6e31b25-8e47-4f36-a10c-e732aa7e1428.png",
    alt: "Various drums and containers in a warehouse"
  },
  {
    src: "public/lovable-uploads/275a803d-5d1a-491c-8d90-c55de3be45ad.png",
    alt: "Pallets and packages in a shipping facility"
  },
  {
    src: "public/lovable-uploads/8452275d-128f-45da-b43f-90c495c254fa.png",
    alt: "Appliance and household items packed for shipping"
  },
  {
    src: "public/lovable-uploads/aec3d23a-8fba-4439-85ec-88285cf2fd29.png",
    alt: "Workers loading items into a shipping container"
  },
  {
    src: "public/lovable-uploads/85f04a52-387b-4e3e-8fe8-5b1476f172a3.png",
    alt: "Workers and forklift loading shipping container"
  },
  {
    src: "public/lovable-uploads/c3482a65-f7a2-4164-ab96-f1226119d1d9.png",
    alt: "Shipping drums being loaded into container"
  },
  {
    src: "public/lovable-uploads/81064313-d991-4317-a4ff-7955835ff8fa.png",
    alt: "Forklift operator moving pallets"
  },
  {
    src: "public/lovable-uploads/ce8c4a7e-bf4b-4b7e-9a53-b05074d0184c.png",
    alt: "Worker standing on pallet in shipping container"
  }
];

const ShippingGallerySlideshow: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 4000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPlaying]);
  
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

  return (
    <section className="py-12 bg-gray-900 text-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">Our Shipping Operations</h2>
        
        <div className="relative max-w-5xl mx-auto">
          {/* Increased height for the slideshow container */}
          <div className="aspect-w-16 aspect-h-9 bg-gray-800 overflow-hidden rounded-lg" style={{ minHeight: '400px', height: 'calc(50vh)' }}>
            {images.map((image, index) => (
              <div 
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentIndex ? "opacity-100" : "opacity-0"
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
            {images.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 mx-1 rounded-full ${
                  index === currentIndex ? "bg-white" : "bg-gray-500"
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
