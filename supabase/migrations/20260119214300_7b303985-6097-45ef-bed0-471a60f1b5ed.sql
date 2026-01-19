-- Create organization_invitations table for pending invitations
CREATE TABLE public.organization_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(organization_id, email)
);

-- Enable Row Level Security
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for organization_invitations
-- Org admins/owners can view invitations for their organization
CREATE POLICY "Org admins can view invitations"
ON public.organization_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_invitations.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Org admins/owners can create invitations
CREATE POLICY "Org admins can create invitations"
ON public.organization_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_invitations.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Org admins/owners can update invitations (cancel, resend)
CREATE POLICY "Org admins can update invitations"
ON public.organization_invitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_invitations.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Org admins/owners can delete invitations
CREATE POLICY "Org admins can delete invitations"
ON public.organization_invitations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_invitations.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Create index for faster lookups
CREATE INDEX idx_org_invitations_org_id ON public.organization_invitations(organization_id);
CREATE INDEX idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX idx_org_invitations_email ON public.organization_invitations(email);