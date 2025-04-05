
-- Create a storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- Create a storage.objects RLS policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Create a storage.objects RLS policy to allow anyone to view images
CREATE POLICY "Allow public access to images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Create a storage.objects RLS policy to allow authenticated users to update their own objects
CREATE POLICY "Allow authenticated users to update their own objects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'images' AND owner = auth.uid());

-- Create a storage.objects RLS policy to allow authenticated users to delete their own objects
CREATE POLICY "Allow authenticated users to delete their own objects"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND owner = auth.uid());

-- Create gallery table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  src TEXT NOT NULL,
  alt TEXT NOT NULL,
  caption TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Allow authenticated users to perform CRUD operations on gallery
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- RLS policy for the gallery table
CREATE POLICY "Allow authenticated users to manage gallery" 
ON public.gallery
USING (true);
