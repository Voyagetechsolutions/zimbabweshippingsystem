
-- Create a storage bucket for custom quote images
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-quotes', 'custom-quotes', true)
ON CONFLICT (id) DO NOTHING;

-- Set up policies for the custom-quotes bucket
CREATE POLICY "Public Access Policy"
ON storage.objects
FOR SELECT
USING (bucket_id = 'custom-quotes');

CREATE POLICY "Authenticated users can upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'custom-quotes' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own objects"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'custom-quotes'
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own objects"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'custom-quotes'
  AND auth.uid() = owner
);
