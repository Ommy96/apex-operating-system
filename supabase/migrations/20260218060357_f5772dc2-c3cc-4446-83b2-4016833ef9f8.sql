
-- Drop legacy report tables
DROP TABLE IF EXISTS public.activity_reports CASCADE;
DROP TABLE IF EXISTS public.program_reports CASCADE;

-- Drop the program_type enum if it's only used by these tables
DROP TYPE IF EXISTS public.program_type CASCADE;
