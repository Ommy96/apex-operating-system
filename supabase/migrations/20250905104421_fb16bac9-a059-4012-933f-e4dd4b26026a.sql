-- Add academic level field to replacements table
ALTER TABLE public.replacements 
ADD COLUMN new_child_academic_level academic_level;