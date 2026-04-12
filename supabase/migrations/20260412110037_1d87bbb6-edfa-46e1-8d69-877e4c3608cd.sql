-- Add partner access columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partner_granted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS partner_notes TEXT,
  ADD COLUMN IF NOT EXISTS plan_override TEXT;

-- Create partner access log table
CREATE TABLE IF NOT EXISTS public.partner_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add validation trigger for action values
CREATE OR REPLACE FUNCTION public.validate_partner_access_log_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.action NOT IN ('granted', 'revoked', 'notes_updated') THEN
    RAISE EXCEPTION 'Invalid action: %', NEW.action;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_partner_access_log_action_trigger
  BEFORE INSERT OR UPDATE ON public.partner_access_log
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_partner_access_log_action();

-- Enable RLS
ALTER TABLE public.partner_access_log ENABLE ROW LEVEL SECURITY;

-- Super admins can view all entries
CREATE POLICY "Super admins can view partner access logs"
  ON public.partner_access_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Super admins can insert entries
CREATE POLICY "Super admins can insert partner access logs"
  ON public.partner_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_partner_access_log_org_id ON public.partner_access_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_is_partner ON public.organizations(is_partner) WHERE is_partner = true;