-- ============================================
-- FEEDBACK SCHEMA UPDATE - RUN IN SUPABASE SQL EDITOR
-- ============================================
-- This script updates the service_reviews table to support the new feedback structure
-- Run this in your Supabase project's SQL Editor

-- Add new columns to service_reviews table
ALTER TABLE public.service_reviews 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS is_first_time text,
ADD COLUMN IF NOT EXISTS booking_ease text,
ADD COLUMN IF NOT EXISTS communication_rating text,
ADD COLUMN IF NOT EXISTS customer_service_rating text,
ADD COLUMN IF NOT EXISTS delivery_on_time text,
ADD COLUMN IF NOT EXISTS goods_condition text,
ADD COLUMN IF NOT EXISTS overall_satisfaction text,
ADD COLUMN IF NOT EXISTS follow_up_answers jsonb,
ADD COLUMN IF NOT EXISTS additional_feedback text,
ADD COLUMN IF NOT EXISTS liked_most text,
ADD COLUMN IF NOT EXISTS can_improve text,
ADD COLUMN IF NOT EXISTS needs_admin_attention boolean DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS service_reviews_admin_attention_idx 
ON public.service_reviews (needs_admin_attention, created_at DESC);

CREATE INDEX IF NOT EXISTS service_reviews_email_idx 
ON public.service_reviews (email);

CREATE INDEX IF NOT EXISTS service_reviews_first_name_idx 
ON public.service_reviews (first_name);

CREATE INDEX IF NOT EXISTS service_reviews_last_name_idx 
ON public.service_reviews (last_name);

-- Add check constraints for new rating fields
DO $$ 
BEGIN
    -- Check if constraint exists before adding
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_booking_ease' 
        AND table_name = 'service_reviews'
    ) THEN
        ALTER TABLE public.service_reviews 
        ADD CONSTRAINT check_booking_ease 
        CHECK (booking_ease IS NULL OR booking_ease IN ('Very Easy', 'Easy', 'Neutral', 'Difficult', 'Very Difficult'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_communication_rating' 
        AND table_name = 'service_reviews'
    ) THEN
        ALTER TABLE public.service_reviews 
        ADD CONSTRAINT check_communication_rating 
        CHECK (communication_rating IS NULL OR communication_rating IN ('Excellent', 'Good', 'Average', 'Poor', 'Very Poor'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_customer_service_rating' 
        AND table_name = 'service_reviews'
    ) THEN
        ALTER TABLE public.service_reviews 
        ADD CONSTRAINT check_customer_service_rating 
        CHECK (customer_service_rating IS NULL OR customer_service_rating IN ('Excellent', 'Good', 'Average', 'Poor', 'Very Poor'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_delivery_on_time' 
        AND table_name = 'service_reviews'
    ) THEN
        ALTER TABLE public.service_reviews 
        ADD CONSTRAINT check_delivery_on_time 
        CHECK (delivery_on_time IS NULL OR delivery_on_time IN ('Yes', 'No'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_goods_condition' 
        AND table_name = 'service_reviews'
    ) THEN
        ALTER TABLE public.service_reviews 
        ADD CONSTRAINT check_goods_condition 
        CHECK (goods_condition IS NULL OR goods_condition IN ('Excellent', 'Good', 'Average', 'Poor', 'Very Poor'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_overall_satisfaction' 
        AND table_name = 'service_reviews'
    ) THEN
        ALTER TABLE public.service_reviews 
        ADD CONSTRAINT check_overall_satisfaction 
        CHECK (overall_satisfaction IS NULL OR overall_satisfaction IN ('Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_is_first_time' 
        AND table_name = 'service_reviews'
    ) THEN
        ALTER TABLE public.service_reviews 
        ADD CONSTRAINT check_is_first_time 
        CHECK (is_first_time IS NULL OR is_first_time IN ('Yes', 'No'));
    END IF;
END $$;

-- Create a view for admin dashboard to easily identify reviews needing attention
CREATE OR REPLACE VIEW public.reviews_needing_attention AS
SELECT 
  id,
  created_at,
  first_name,
  last_name,
  email,
  whatsapp_number,
  booking_ease,
  communication_rating,
  customer_service_rating,
  delivery_on_time,
  goods_condition,
  overall_satisfaction,
  follow_up_answers,
  additional_feedback,
  liked_most,
  can_improve,
  needs_admin_attention
FROM public.service_reviews
WHERE needs_admin_attention = true
ORDER BY created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.reviews_needing_attention TO authenticated;
GRANT SELECT ON public.reviews_needing_attention TO anon;

-- Update RLS policies to ensure new fields work properly
-- The existing policies should work, but let's make sure inserts work with new fields

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'service_reviews' 
AND table_schema = 'public'
ORDER BY ordinal_position;