-- Add staff column to medical_records table for hospital visits
ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS staff TEXT;