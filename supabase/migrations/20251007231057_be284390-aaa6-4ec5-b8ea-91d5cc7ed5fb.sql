-- Drop the foreign key constraint first
ALTER TABLE public.attendance_records 
DROP CONSTRAINT IF EXISTS attendance_records_program_id_fkey;

-- Now change program_id from UUID to TEXT to store program names directly
ALTER TABLE public.attendance_records 
ALTER COLUMN program_id TYPE TEXT USING program_id::TEXT;