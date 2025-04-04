
export interface GalleryImage {
  id?: string;
  src: string;
  alt: string;
  caption: string;
  category: GalleryCategory;
  created_at?: string;
  updated_at?: string;
}

export type GalleryCategory = 'facilities' | 'shipments' | 'team' | 'customers';

export interface GalleryCategoryInfo {
  value: GalleryCategory;
  label: string;
  icon: string;
}
