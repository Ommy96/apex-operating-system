-- Fix security vulnerability: Restrict access to alumni personal information
-- Remove the overly permissive public access policy
DROP POLICY IF EXISTS "Everyone can view alumni" ON public.alumni;

-- Create a secure policy that only allows authenticated staff and above to view alumni
CREATE POLICY "Authenticated staff can view alumni" 
ON public.alumni 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'management'::user_role, 'staff'::user_role])
);

-- Keep the existing management policy for admin/management operations
-- (This policy already exists and remains unchanged)