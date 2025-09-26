-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Staff can create and view their own program reports" ON public.program_reports;
DROP POLICY IF EXISTS "Admins and management can manage all program reports" ON public.program_reports;

-- Create INSERT policies for program reports
CREATE POLICY "Admins and management can insert program reports"
ON public.program_reports
FOR INSERT
WITH CHECK (
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'management'::user_role])
);

CREATE POLICY "Staff can insert own program reports"
ON public.program_reports
FOR INSERT
WITH CHECK (
  get_user_role(auth.uid()) = 'staff'::user_role AND created_by = auth.uid()
);

-- Recreate the existing management policy for ALL operations
CREATE POLICY "Admins and management can manage all program reports" 
ON public.program_reports
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'management'::user_role]));

-- Recreate the staff policy for their own reports
CREATE POLICY "Staff can manage their own program reports" 
ON public.program_reports
FOR ALL
USING (
  CASE
    WHEN (get_user_role(auth.uid()) = 'staff'::user_role) THEN (created_by = auth.uid())
    ELSE false
  END
);