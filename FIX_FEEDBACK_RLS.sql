-- ============================================
-- FIX FEEDBACK RLS POLICIES - RUN IN SUPABASE SQL EDITOR
-- ============================================
-- This script fixes the Row Level Security policies for the updated feedback system

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Allow public inserts" ON public.service_reviews;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.service_reviews;

-- Create new RLS policy for public inserts (anonymous users can submit feedback)
CREATE POLICY "Allow public feedback inserts"
ON public.service_reviews 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Create new RLS policy for authenticated users to read all reviews
CREATE POLICY "Allow authenticated feedback select"
ON public.service_reviews 
FOR SELECT 
TO authenticated
USING (true);

-- Create policy for authenticated users to update reviews (for admin actions)
CREATE POLICY "Allow authenticated feedback updates"
ON public.service_reviews 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT INSERT ON public.service_reviews TO anon;
GRANT SELECT ON public.service_reviews TO authenticated;
GRANT UPDATE ON public.service_reviews TO authenticated;

-- Also ensure the feedback_custom_questions table has proper policies
DROP POLICY IF EXISTS "Allow public select" ON public.feedback_custom_questions;
DROP POLICY IF EXISTS "Allow authenticated all" ON public.feedback_custom_questions;

-- Recreate policies for custom questions
CREATE POLICY "Allow public select custom questions"
ON public.feedback_custom_questions 
FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated manage custom questions"
ON public.feedback_custom_questions 
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- Grant permissions for custom questions
GRANT SELECT ON public.feedback_custom_questions TO anon;
GRANT ALL ON public.feedback_custom_questions TO authenticated;

-- Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('service_reviews', 'feedback_custom_questions')
ORDER BY tablename, policyname;