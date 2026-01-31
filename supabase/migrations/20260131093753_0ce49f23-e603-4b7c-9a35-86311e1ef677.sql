-- Add family_profile column to family_adoption table
ALTER TABLE public.family_adoption ADD COLUMN IF NOT EXISTS family_profile TEXT;