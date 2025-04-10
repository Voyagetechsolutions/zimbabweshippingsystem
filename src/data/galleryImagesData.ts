
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
    src: "https://oncsaunsqtekwwbzvvyh.supabase.co/storage/v1/object/public/images/gallery/shipping_container_1.jpg",
    alt: "Container loading process",
    caption: "Professional loading of shipping containers for Zimbabwe export",
    category: "shipments"
  },
  {
    src: "https://oncsaunsqtekwwbzvvyh.supabase.co/storage/v1/object/public/images/gallery/warehouse_1.jpg",
    alt: "UK warehouse facility",
    caption: "Our spacious UK warehouse for secure storage before shipping",
    category: "facilities"
  },
  {
    src: "https://oncsaunsqtekwwbzvvyh.supabase.co/storage/v1/object/public/images/gallery/team_1.jpg",
    alt: "Logistics team at work",
    caption: "Our dedicated team ensuring safe and efficient shipping",
    category: "team"
  },
  {
    src: "https://oncsaunsqtekwwbzvvyh.supabase.co/storage/v1/object/public/images/gallery/delivery_1.jpg",
    alt: "Final delivery in Zimbabwe",
    caption: "On-time delivery to destinations throughout Zimbabwe",
    category: "customers"
  },
  {
    src: "https://oncsaunsqtekwwbzvvyh.supabase.co/storage/v1/object/public/images/gallery/drums_1.jpg",
    alt: "Shipping drums ready for transport",
    caption: "200L drums prepared for secure international shipping",
    category: "shipments"
  }
];
