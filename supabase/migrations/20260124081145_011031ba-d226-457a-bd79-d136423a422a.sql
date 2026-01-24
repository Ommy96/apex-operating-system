-- Add student_id column to school_visit_reports for child profile linking
-- This enables the School Visits tab in the child profile view

-- Add student_id column (nullable to maintain backward compatibility)
ALTER TABLE public.school_visit_reports 
ADD COLUMN student_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

-- Add index for efficient lookups by child
CREATE INDEX idx_school_visit_reports_student_id 
ON public.school_visit_reports(student_id);

-- Add comment for documentation
COMMENT ON COLUMN public.school_visit_reports.student_id IS 'Reference to the child/student being visited at school';