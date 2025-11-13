-- Add family_status and source_of_income columns to family_adoption table
ALTER TABLE public.family_adoption
ADD COLUMN family_status text,
ADD COLUMN source_of_income text;

-- Add check constraint for family_status
ALTER TABLE public.family_adoption
ADD CONSTRAINT family_status_check 
CHECK (family_status IN ('Single Parent Home', 'No Parent', 'Dual Parent Home') OR family_status IS NULL);