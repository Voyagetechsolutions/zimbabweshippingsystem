
-- Create gallery table
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    src TEXT NOT NULL,
    alt TEXT NOT NULL,
    caption TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on gallery table
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Create policies for gallery table
CREATE POLICY "Gallery images are viewable by everyone" 
    ON public.gallery FOR SELECT 
    USING (true);

CREATE POLICY "Gallery images can be inserted by authenticated users"
    ON public.gallery FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Gallery images can be updated by admin users"
    ON public.gallery FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.is_admin = true
        )
    );

CREATE POLICY "Gallery images can be deleted by admin users"
    ON public.gallery FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.is_admin = true
        )
    );

-- Add bucket permissions for gallery images
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage policy to allow authenticated users to upload files
CREATE POLICY "Public images are viewable by everyone"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'public');

CREATE POLICY "Gallery images can be uploaded by authenticated users"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'public' AND (storage.foldername(name))[1] = 'gallery');

CREATE POLICY "Gallery images can be updated by admin users"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'public' AND 
        (storage.foldername(name))[1] = 'gallery' AND
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.is_admin = true
        )
    );

CREATE POLICY "Gallery images can be deleted by admin users"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'public' AND 
        (storage.foldername(name))[1] = 'gallery' AND
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.is_admin = true
        )
    );
