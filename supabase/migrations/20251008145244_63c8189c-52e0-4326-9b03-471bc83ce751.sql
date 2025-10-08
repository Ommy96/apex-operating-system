-- Add course_name column to children table for tertiary education students
ALTER TABLE public.children
ADD COLUMN course_name text;