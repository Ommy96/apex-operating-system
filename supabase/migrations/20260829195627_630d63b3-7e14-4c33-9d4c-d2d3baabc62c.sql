CREATE TABLE IF NOT EXISTS public.org_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_settings TO authenticated;
GRANT ALL ON public.org_settings TO service_role;

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view org settings"
  ON public.org_settings FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org admins can insert org settings"
  ON public.org_settings FOR INSERT TO authenticated
  WITH CHECK (
    public.get_org_member_role(auth.uid(), organization_id) = ANY (ARRAY['owner','admin'])
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Org admins can update org settings"
  ON public.org_settings FOR UPDATE TO authenticated
  USING (
    public.get_org_member_role(auth.uid(), organization_id) = ANY (ARRAY['owner','admin'])
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    public.get_org_member_role(auth.uid(), organization_id) = ANY (ARRAY['owner','admin'])
    OR public.is_super_admin(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_settings_updated_at ON public.org_settings;
CREATE TRIGGER trg_org_settings_updated_at
  BEFORE UPDATE ON public.org_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_org_settings_org_key ON public.org_settings (organization_id, key);

NOTIFY pgrst, 'reload schema';