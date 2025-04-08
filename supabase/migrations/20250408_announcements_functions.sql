
-- Create database functions for announcements management

-- Function to get all announcements with author details
CREATE OR REPLACE FUNCTION public.get_announcements()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'id', a.id,
    'title', a.title,
    'content', a.content,
    'category', a.category,
    'is_active', a.is_active,
    'created_at', a.created_at,
    'updated_at', a.updated_at,
    'created_by', a.created_by,
    'expiry_date', a.expiry_date,
    'author_name', p.full_name
  )
  FROM public.announcements a
  LEFT JOIN public.profiles p ON a.created_by = p.id
  ORDER BY a.created_at DESC;
END;
$$;

-- Function to create a new announcement
CREATE OR REPLACE FUNCTION public.create_announcement(
  p_title text,
  p_content text,
  p_category text,
  p_is_active boolean,
  p_created_by uuid,
  p_expiry_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  new_announcement json;
BEGIN
  INSERT INTO public.announcements (
    title, 
    content, 
    category, 
    is_active, 
    created_by, 
    expiry_date
  )
  VALUES (
    p_title, 
    p_content, 
    p_category, 
    p_is_active, 
    p_created_by, 
    p_expiry_date
  )
  RETURNING id INTO new_id;
  
  SELECT json_build_object(
    'id', a.id,
    'title', a.title,
    'content', a.content,
    'category', a.category,
    'is_active', a.is_active,
    'created_at', a.created_at,
    'updated_at', a.updated_at,
    'created_by', a.created_by,
    'expiry_date', a.expiry_date,
    'author_name', p.full_name
  ) INTO new_announcement
  FROM public.announcements a
  LEFT JOIN public.profiles p ON a.created_by = p.id
  WHERE a.id = new_id;
  
  RETURN new_announcement;
END;
$$;

-- Function to update an existing announcement
CREATE OR REPLACE FUNCTION public.update_announcement(
  p_id uuid,
  p_title text,
  p_content text,
  p_category text,
  p_is_active boolean,
  p_expiry_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_announcement json;
BEGIN
  UPDATE public.announcements
  SET 
    title = p_title,
    content = p_content,
    category = p_category,
    is_active = p_is_active,
    updated_at = now(),
    expiry_date = p_expiry_date
  WHERE id = p_id;
  
  SELECT json_build_object(
    'id', a.id,
    'title', a.title,
    'content', a.content,
    'category', a.category,
    'is_active', a.is_active,
    'created_at', a.created_at,
    'updated_at', a.updated_at,
    'created_by', a.created_by,
    'expiry_date', a.expiry_date,
    'author_name', p.full_name
  ) INTO updated_announcement
  FROM public.announcements a
  LEFT JOIN public.profiles p ON a.created_by = p.id
  WHERE a.id = p_id;
  
  RETURN updated_announcement;
END;
$$;

-- Function to delete an announcement
CREATE OR REPLACE FUNCTION public.delete_announcement(
  p_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.announcements
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$;

-- Function to get active announcements for customer display
CREATE OR REPLACE FUNCTION public.get_active_announcements()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'id', a.id,
    'title', a.title,
    'content', a.content,
    'category', a.category,
    'created_at', a.created_at,
    'author_name', p.full_name
  )
  FROM public.announcements a
  LEFT JOIN public.profiles p ON a.created_by = p.id
  WHERE a.is_active = true
  AND (a.expiry_date IS NULL OR a.expiry_date > now())
  ORDER BY a.created_at DESC;
END;
$$;
