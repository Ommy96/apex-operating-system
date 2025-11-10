-- Make date field optional with default value in medical_records
ALTER TABLE public.medical_records 
ALTER COLUMN date SET DEFAULT CURRENT_DATE,
ALTER COLUMN date DROP NOT NULL;