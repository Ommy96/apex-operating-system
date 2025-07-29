-- Update RLS policy to allow both staff and admins to insert program reports
DROP POLICY IF EXISTS "Staff can create program reports" ON public.program_reports;
DROP POLICY IF EXISTS "Admins can insert program reports" ON public.program_reports;

CREATE POLICY "Staff and admins can create program reports" 
ON public.program_reports 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role]));