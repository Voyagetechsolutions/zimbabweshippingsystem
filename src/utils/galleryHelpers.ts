
import { supabase } from '@/integrations/supabase/client';
import { callRpcFunction } from '@/utils/supabaseUtils';
import { GalleryImage } from '@/types/gallery';

/**
 * Upload an image to the gallery
 */
export const addGalleryImage = async (
  imageSrc: string,
  alt: string,
  caption: string,
  category: string
): Promise<GalleryImage | null> => {
  try {
    const { data, error } = await callRpcFunction('insert_gallery_image', {
      p_src: imageSrc,
      p_alt: alt,
      p_caption: caption,
      p_category: category
    });

    if (error) {
      console.error('Error adding gallery image:', error);
      return null;
    }

    return data as unknown as GalleryImage;
  } catch (error) {
    console.error('Error adding gallery image:', error);
    return null;
  }
};

/**
 * Batch upload multiple gallery images
 */
export const batchAddGalleryImages = async (
  images: Array<{
    src: string;
    alt: string;
    caption: string;
    category: string;
  }>
): Promise<GalleryImage[]> => {
  const results: GalleryImage[] = [];

  for (const image of images) {
    const result = await addGalleryImage(
      image.src,
      image.alt,
      image.caption,
      image.category
    );
    
    if (result) {
      results.push(result);
    }
  }

  return results;
};
