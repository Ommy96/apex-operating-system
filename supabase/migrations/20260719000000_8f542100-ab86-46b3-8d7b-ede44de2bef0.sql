
CREATE TABLE IF NOT EXISTS public.waitlist_application_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.waitlist_applications(id) ON DELETE CASCADE,
  need_type_id UUID NOT NULL REFERENCES public.need_types(id) ON DELETE RESTRICT,
  estimated_cost NUMERIC,
  currency TEXT DEFAULT 'KES',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, need_type_id)
);

CREATE INDEX IF NOT EXISTS idx_wan_application ON public.waitlist_application_needs(application_id);
CREATE INDEX IF NOT EXISTS idx_wan_org ON public.waitlist_application_needs(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_application_needs TO authenticated;
GRANT ALL ON public.waitlist_application_needs TO service_role;

ALTER TABLE public.waitlist_application_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wan_org_members_select" ON public.waitlist_application_needs
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "wan_org_members_insert" ON public.waitlist_application_needs
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "wan_org_members_update" ON public.waitlist_application_needs
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "wan_org_members_delete" ON public.waitlist_application_needs
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE TRIGGER trg_wan_updated_at
  BEFORE UPDATE ON public.waitlist_application_needs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
