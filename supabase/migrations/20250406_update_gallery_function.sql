
-- Function to update a gallery image
CREATE OR REPLACE FUNCTION public.update_gallery_image(
  p_id UUID,
  p_src TEXT,
  p_alt TEXT,
  p_caption TEXT,
  p_category TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  updated_image json;
BEGIN
  UPDATE public.gallery
  SET 
    src = p_src,
    alt = p_alt,
    caption = p_caption,
    category = p_category,
    updated_at = now()
  WHERE id = p_id;
  
  IF NOT FOUND THEN
    RETURN null;
  END IF;
  
  SELECT json_build_object(
    'id', id,
    'src', src,
    'alt', alt,
    'caption', caption,
    'category', category,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO updated_image
  FROM public.gallery
  WHERE id = p_id;
  
  RETURN updated_image;
END;
$$;
