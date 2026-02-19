-- Add is_disabled column to profiles table for disabling team members
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;

-- Add index for faster queries on disabled status
CREATE INDEX IF NOT EXISTS idx_profiles_is_disabled ON public.profiles(is_disabled);