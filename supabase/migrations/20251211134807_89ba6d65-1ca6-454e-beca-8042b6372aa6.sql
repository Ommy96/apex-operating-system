-- Add unique identifier columns to children, programs, and sponsors tables

-- Add student_id to children table
ALTER TABLE public.children
ADD COLUMN student_id text UNIQUE;

-- Add program_id to programs table  
ALTER TABLE public.programs
ADD COLUMN program_id text UNIQUE;

-- Add sponsor_id to sponsors table
ALTER TABLE public.sponsors
ADD COLUMN sponsor_id text UNIQUE;

-- Create indexes for faster searching
CREATE INDEX idx_children_student_id ON public.children(student_id);
CREATE INDEX idx_programs_program_id ON public.programs(program_id);
CREATE INDEX idx_sponsors_sponsor_id ON public.sponsors(sponsor_id);