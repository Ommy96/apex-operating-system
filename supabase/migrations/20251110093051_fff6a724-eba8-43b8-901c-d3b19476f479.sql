-- Add gender column to medical_records table
ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Copy existing academic_level data if needed for migration purposes
-- (optional - remove this if you don't want to preserve the data)
UPDATE public.medical_records 
SET gender = 
  CASE 
    WHEN academic_level IS NOT NULL THEN NULL
    ELSE NULL
  END
WHERE gender IS NULL;

-- Drop the academic_level column
ALTER TABLE public.medical_records 
DROP COLUMN IF EXISTS academic_level;