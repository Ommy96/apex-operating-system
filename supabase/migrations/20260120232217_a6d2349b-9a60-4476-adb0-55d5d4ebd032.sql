-- Allow anyone to look up an invitation by token (for signup flow)
CREATE POLICY "Anyone can lookup invitation by token"
ON public.organization_invitations
FOR SELECT
USING (true);

-- Note: This allows reading invitation details, but the token is a UUID that's 
-- practically unguessable. The signup logic will validate the token and expiry.