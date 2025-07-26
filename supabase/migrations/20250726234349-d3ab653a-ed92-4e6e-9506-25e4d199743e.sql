-- Update the program enum to include new program types
ALTER TYPE public.program_type ADD VALUE IF NOT EXISTS 'Communication';
ALTER TYPE public.program_type ADD VALUE IF NOT EXISTS 'Chess';
ALTER TYPE public.program_type ADD VALUE IF NOT EXISTS 'Fundraising';
ALTER TYPE public.program_type ADD VALUE IF NOT EXISTS 'Admin';
ALTER TYPE public.program_type ADD VALUE IF NOT EXISTS 'Content Creation';