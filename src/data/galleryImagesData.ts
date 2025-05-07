
import { GalleryCategory } from '@/types/gallery';

// Sample gallery images data for the populator
interface GalleryImageData {
  src: string;
  alt: string;
  caption: string;
  category: GalleryCategory;
}

export const galleryImages: GalleryImageData[] = [
  // Shipment images
  {
    src: "/lovable-uploads/5fac2a37-1652-4c06-8f85-d373c1e9ccd6.png",
    alt: "Container loading process",
    caption: "Professional loading of shipping containers for Zimbabwe export",
    category: "shipments"
  },
  {
    src: "/lovable-uploads/87d356cd-e4fd-45cd-a049-81430ed045d8.png",
    alt: "UK warehouse facility",
    caption: "Our spacious UK warehouse for secure storage before shipping",
    category: "facilities"
  },
  {
    src: "/lovable-uploads/14353843-5722-4925-ae94-9139b2b90e3b.png",
    alt: "Logistics team at work",
    caption: "Our dedicated team ensuring safe and efficient shipping",
    category: "team"
  },
  {
    src: "/lovable-uploads/bb75a161-68c8-4e58-b4d4-976981bfc09d.png",
    alt: "Final delivery in Zimbabwe",
    caption: "On-time delivery to destinations throughout Zimbabwe",
    category: "customers"
  },
  {
    src: "/lovable-uploads/f286a2cc-08fc-44f2-97d7-32aa9f8b7b29.png",
    alt: "Shipping drums ready for transport",
    caption: "200L drums prepared for secure international shipping",
    category: "shipments"
  }
];
