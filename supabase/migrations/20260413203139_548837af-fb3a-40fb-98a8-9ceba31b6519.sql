-- Drop the existing policy that requires auth
DROP POLICY IF EXISTS "Authenticated users can lookup invitation by token" ON public.organization_invitations;

-- Create a new policy allowing anonymous lookup by token (for invite signup flow)
CREATE POLICY "Anyone can lookup invitation by token"
ON public.organization_invitations
FOR SELECT
TO anon, authenticated
USING (status = 'pending');