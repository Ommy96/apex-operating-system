-- Update the RLS policies for children table to allow staff to insert/update children
DROP POLICY "Admins can insert children" ON public.children;
DROP POLICY "Admins can update children" ON public.children;

-- Allow staff and admin to insert/update children
CREATE POLICY "Staff and admins can insert children" 
ON public.children 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can update children" 
ON public.children 
FOR UPDATE 
USING (get_user_role(auth.uid()) IN ('admin', 'staff'));