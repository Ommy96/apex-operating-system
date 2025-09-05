-- Add academic level field to replacements table using text type
ALTER TABLE public.replacements 
ADD COLUMN new_child_academic_level text;