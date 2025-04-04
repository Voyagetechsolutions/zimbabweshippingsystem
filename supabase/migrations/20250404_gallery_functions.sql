
-- Function to get all gallery images
CREATE OR REPLACE FUNCTION public.get_gallery_images()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'id', id,
    'src', src,
    'alt', alt,
    'caption', caption,
    'category', category,
    'created_at', created_at,
    'updated_at', updated_at
  )
  FROM public.gallery
  ORDER BY created_at DESC;
END;
$$;

-- Function to insert a gallery image
CREATE OR REPLACE FUNCTION public.insert_gallery_image(
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
  new_id UUID;
  new_image json;
BEGIN
  INSERT INTO public.gallery (src, alt, caption, category)
  VALUES (p_src, p_alt, p_caption, p_category)
  RETURNING id INTO new_id;
  
  SELECT json_build_object(
    'id', id,
    'src', src,
    'alt', alt,
    'caption', caption,
    'category', category,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO new_image
  FROM public.gallery
  WHERE id = new_id;
  
  RETURN new_image;
END;
$$;

-- Function to delete a gallery image
CREATE OR REPLACE FUNCTION public.delete_gallery_image(p_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  DELETE FROM public.gallery
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$;
