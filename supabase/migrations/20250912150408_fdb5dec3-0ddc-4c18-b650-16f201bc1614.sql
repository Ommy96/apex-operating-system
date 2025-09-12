-- Add term field to activities table for academic performance tracking
ALTER TABLE public.activities 
ADD COLUMN term text;