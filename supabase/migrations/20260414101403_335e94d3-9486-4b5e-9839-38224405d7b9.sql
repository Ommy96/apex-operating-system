
CREATE OR REPLACE FUNCTION public.accept_invitation(
  _invitation_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _invitation RECORD;
BEGIN
  -- Look up the pending invitation
  SELECT id, organization_id, role, email, status
  INTO _invitation
  FROM public.organization_invitations
  WHERE id = _invitation_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Insert into organization_members (ignore if already exists)
  INSERT INTO public.organization_members (user_id, organization_id, role, is_primary)
  VALUES (_user_id, _invitation.organization_id, _invitation.role, true)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- Mark invitation as accepted
  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = _invitation_id;

  RETURN true;
END;
$$;
