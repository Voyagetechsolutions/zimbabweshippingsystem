import { useState, useEffect } from 'react';

interface ImageOptimizationOptions {
  src: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png' | 'auto';
}

/**
 * Hook for image optimization
 * Can be extended to work with image CDNs like Cloudinary, Imgix, etc.
 * Currently provides basic responsive image loading
 */
export const useImageOptimization = ({
  src,
  width,
  height,
  quality = 80,
  format = 'auto',
}: ImageOptimizationOptions) => {
  const [optimizedSrc, setOptimizedSrc] = useState(src);
  const [isWebPSupported, setIsWebPSupported] = useState(false);

  useEffect(() => {
    // Check WebP support
    const checkWebPSupport = () => {
      const elem = document.createElement('canvas');
      if (elem.getContext && elem.getContext('2d')) {
        return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      }
      return false;
    };

    setIsWebPSupported(checkWebPSupport());
  }, []);

  useEffect(() => {
    // If using a CDN, construct optimized URL
    // Example for Cloudinary:
    // const cloudinaryUrl = `https://res.cloudinary.com/your-cloud/image/upload/w_${width},h_${height},q_${quality},f_${format}/${src}`;
    
    // For now, just return the original src
    // You can extend this to work with your image CDN
    let optimized = src;

    // If WebP is supported and format is auto, prefer WebP
    if (isWebPSupported && format === 'auto') {
      // This would be implemented based on your CDN
      // optimized = optimized.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }

    setOptimizedSrc(optimized);
  }, [src, width, height, quality, format, isWebPSupported]);

  return {
    src: optimizedSrc,
    isWebPSupported,
  };
};

/**
 * Generate srcSet for responsive images
 */
export const generateSrcSet = (
  src: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1536]
): string => {
  // This would be implemented based on your CDN
  // For example with Cloudinary:
  // return widths.map(w => `${baseUrl}/w_${w}/${src} ${w}w`).join(', ');
  
  return src; // Fallback to original
};

/**
 * Get optimal image size based on container
 */
export const useResponsiveImageSize = (containerRef: React.RefObject<HTMLElement>) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [containerRef]);

  return size;
};
