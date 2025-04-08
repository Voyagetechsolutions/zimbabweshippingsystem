
-- Add new columns to announcements table
ALTER TABLE public.announcements 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_locations TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN NOT NULL DEFAULT false;

-- Update get_announcements function to include new fields
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
    'author_name', p.full_name,
    'status', a.status,
    'publish_at', a.publish_at,
    'archived', a.archived,
    'target_roles', a.target_roles,
    'target_locations', a.target_locations,
    'is_critical', a.is_critical
  )
  FROM public.announcements a
  LEFT JOIN public.profiles p ON a.created_by = p.id
  ORDER BY a.created_at DESC;
END;
$$;

-- Update create_announcement function to include new fields
CREATE OR REPLACE FUNCTION public.create_announcement(
  p_title text,
  p_content text,
  p_category text,
  p_is_active boolean,
  p_created_by uuid,
  p_expiry_date timestamp with time zone DEFAULT NULL,
  p_status text DEFAULT 'published',
  p_publish_at timestamp with time zone DEFAULT NULL,
  p_target_roles text[] DEFAULT NULL,
  p_target_locations text[] DEFAULT NULL,
  p_is_critical boolean DEFAULT false
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
    expiry_date,
    status,
    publish_at,
    target_roles,
    target_locations,
    is_critical
  )
  VALUES (
    p_title, 
    p_content, 
    p_category, 
    p_is_active, 
    p_created_by, 
    p_expiry_date,
    p_status,
    p_publish_at,
    p_target_roles,
    p_target_locations,
    p_is_critical
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
    'author_name', p.full_name,
    'status', a.status,
    'publish_at', a.publish_at,
    'archived', a.archived,
    'target_roles', a.target_roles,
    'target_locations', a.target_locations,
    'is_critical', a.is_critical
  ) INTO new_announcement
  FROM public.announcements a
  LEFT JOIN public.profiles p ON a.created_by = p.id
  WHERE a.id = new_id;
  
  RETURN new_announcement;
END;
$$;

-- Update update_announcement function to include new fields
CREATE OR REPLACE FUNCTION public.update_announcement(
  p_id uuid,
  p_title text,
  p_content text,
  p_category text,
  p_is_active boolean,
  p_expiry_date timestamp with time zone DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_publish_at timestamp with time zone DEFAULT NULL,
  p_archived boolean DEFAULT NULL,
  p_target_roles text[] DEFAULT NULL,
  p_target_locations text[] DEFAULT NULL,
  p_is_critical boolean DEFAULT NULL
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
    expiry_date = p_expiry_date,
    status = COALESCE(p_status, status),
    publish_at = COALESCE(p_publish_at, publish_at),
    archived = COALESCE(p_archived, archived),
    target_roles = COALESCE(p_target_roles, target_roles),
    target_locations = COALESCE(p_target_locations, target_locations),
    is_critical = COALESCE(p_is_critical, is_critical)
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
    'author_name', p.full_name,
    'status', a.status,
    'publish_at', a.publish_at,
    'archived', a.archived,
    'target_roles', a.target_roles,
    'target_locations', a.target_locations,
    'is_critical', a.is_critical
  ) INTO updated_announcement
  FROM public.announcements a
  LEFT JOIN public.profiles p ON a.created_by = p.id
  WHERE a.id = p_id;
  
  RETURN updated_announcement;
END;
$$;

-- Archive announcement function
CREATE OR REPLACE FUNCTION public.archive_announcement(
  p_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_announcement json;
BEGIN
  UPDATE public.announcements
  SET 
    archived = true,
    updated_at = now()
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
    'author_name', p.full_name,
    'status', a.status,
    'publish_at', a.publish_at,
    'archived', a.archived,
    'target_roles', a.target_roles,
    'target_locations', a.target_locations,
    'is_critical', a.is_critical
  ) INTO archived_announcement
  FROM public.announcements a
  LEFT JOIN public.profiles p ON a.created_by = p.id
  WHERE a.id = p_id;
  
  RETURN archived_announcement;
END;
$$;

-- Function to duplicate announcement
CREATE OR REPLACE FUNCTION public.duplicate_announcement(
  p_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  original_announcement public.announcements;
  new_id UUID;
  new_announcement json;
BEGIN
  -- Get the original announcement
  SELECT * INTO original_announcement
  FROM public.announcements
  WHERE id = p_id;
  
  -- Insert a duplicate with "Copy of" prefix and draft status
  INSERT INTO public.announcements (
    title, 
    content, 
    category, 
    is_active, 
    created_by, 
    expiry_date,
    status,
    publish_at,
    target_roles,
    target_locations,
    is_critical
  )
  VALUES (
    'Copy of ' || original_announcement.title, 
    original_announcement.content, 
    original_announcement.category, 
    false, -- Set inactive by default
    original_announcement.created_by, 
    original_announcement.expiry_date,
    'draft', -- Set as draft
    original_announcement.publish_at,
    original_announcement.target_roles,
    original_announcement.target_locations,
    original_announcement.is_critical
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
    'author_name', p.full_name,
    'status', a.status,
    'publish_at', a.publish_at,
    'archived', a.archived,
    'target_roles', a.target_roles,
    'target_locations', a.target_locations,
    'is_critical', a.is_critical
  ) INTO new_announcement
  FROM public.announcements a
  LEFT JOIN public.profiles p ON a.created_by = p.id
  WHERE a.id = new_id;
  
  RETURN new_announcement;
END;
$$;

-- Batch operation function
CREATE OR REPLACE FUNCTION public.batch_update_announcements(
  p_ids uuid[],
  p_is_active boolean DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_archived boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.announcements
  SET 
    is_active = COALESCE(p_is_active, is_active),
    status = COALESCE(p_status, status),
    archived = COALESCE(p_archived, archived),
    updated_at = now()
  WHERE id = ANY(p_ids);
  
  RETURN FOUND;
END;
$$;

-- Update get_active_announcements to include targeting and scheduled publication
CREATE OR REPLACE FUNCTION public.get_active_announcements(
  p_user_role text DEFAULT NULL,
  p_user_location text DEFAULT NULL
)
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
    'author_name', p.full_name,
    'is_critical', a.is_critical
  )
  FROM public.announcements a
  LEFT JOIN public.profiles p ON a.created_by = p.id
  WHERE a.is_active = true
  AND a.status = 'published'
  AND (a.expiry_date IS NULL OR a.expiry_date > now())
  AND (a.publish_at IS NULL OR a.publish_at <= now())
  AND (a.archived = false)
  AND (
    a.target_roles IS NULL 
    OR array_length(a.target_roles, 1) IS NULL 
    OR p_user_role IS NULL 
    OR p_user_role = ANY(a.target_roles)
  )
  AND (
    a.target_locations IS NULL 
    OR array_length(a.target_locations, 1) IS NULL 
    OR p_user_location IS NULL 
    OR p_user_location = ANY(a.target_locations)
  )
  ORDER BY a.is_critical DESC, a.created_at DESC;
END;
$$;

-- Function to create announcement notification
CREATE OR REPLACE FUNCTION public.create_announcement_notification(
  p_announcement_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_announcement public.announcements;
  v_author_name text;
BEGIN
  -- Get the announcement details
  SELECT a.*, p.full_name INTO v_announcement, v_author_name
  FROM public.announcements a
  LEFT JOIN public.profiles p ON a.created_by = p.id
  WHERE a.id = p_announcement_id;
  
  -- Create notifications for users based on targeting
  INSERT INTO public.notifications (
    title,
    message,
    type,
    user_id,
    related_id
  )
  SELECT
    'New Announcement: ' || v_announcement.title,
    CASE 
      WHEN v_announcement.is_critical THEN 'CRITICAL: ' || v_announcement.content
      ELSE v_announcement.content
    END,
    'announcement',
    p.id,
    p_announcement_id
  FROM
    public.profiles p
  WHERE
    -- Target based on roles if specified
    (
      v_announcement.target_roles IS NULL
      OR array_length(v_announcement.target_roles, 1) IS NULL
      OR p.role = ANY(v_announcement.target_roles)
    );
  
  RETURN TRUE;
END;
$$;
