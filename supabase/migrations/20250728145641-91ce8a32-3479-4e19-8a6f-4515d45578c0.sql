-- Add policy to allow admins to update any profile
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin'::user_role);