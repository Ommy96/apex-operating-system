-- Add child_id column to program_entries table to differentiate children in different programs
ALTER TABLE public.program_entries 
ADD COLUMN child_id uuid REFERENCES public.children(id) ON DELETE CASCADE;

-- Create an index for better query performance
CREATE INDEX idx_program_entries_child_id ON public.program_entries(child_id);

-- Create a unique constraint to prevent duplicate entries for the same child in the same program
CREATE UNIQUE INDEX idx_program_entries_program_child ON public.program_entries(program_id, child_id) WHERE child_id IS NOT NULL;