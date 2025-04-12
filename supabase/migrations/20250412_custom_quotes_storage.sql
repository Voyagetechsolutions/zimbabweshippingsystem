
-- Create storage bucket for custom quote images
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-quotes', 'custom-quotes', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies for the custom-quotes bucket
CREATE POLICY "Public Access for custom quote images"
ON storage.objects 
FOR SELECT
USING (bucket_id = 'custom-quotes');

CREATE POLICY "Authenticated users can upload custom quote images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'custom-quotes' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update their custom quote images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'custom-quotes' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete their custom quote images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'custom-quotes' AND
  auth.role() = 'authenticated'
);
