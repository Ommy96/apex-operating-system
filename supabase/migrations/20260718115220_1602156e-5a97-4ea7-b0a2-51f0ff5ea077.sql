
-- Sponsorship packages
CREATE TABLE IF NOT EXISTS public.sponsorship_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  monthly_cost numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KES',
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsorship_packages TO authenticated;
GRANT ALL ON public.sponsorship_packages TO service_role;
ALTER TABLE public.sponsorship_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage sponsorship packages"
  ON public.sponsorship_packages FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE TABLE IF NOT EXISTS public.sponsorship_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.sponsorship_packages(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_label text NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsorship_package_items TO authenticated;
GRANT ALL ON public.sponsorship_package_items TO service_role;
ALTER TABLE public.sponsorship_package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage package items"
  ON public.sponsorship_package_items FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE INDEX IF NOT EXISTS idx_package_items_pkg ON public.sponsorship_package_items(package_id);

-- Waitlist applications
CREATE TABLE IF NOT EXISTS public.waitlist_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id uuid REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  applicant_name text,
  applicant_age int,
  applicant_location text,
  applicant_notes text,
  guardian_contact text,
  status text NOT NULL DEFAULT 'application',
  vulnerability_score int NOT NULL DEFAULT 0,
  score_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  matched_package_id uuid REFERENCES public.sponsorship_packages(id) ON DELETE SET NULL,
  matched_donor_id uuid REFERENCES public.donor_accounts(id) ON DELETE SET NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  scored_at timestamptz,
  matched_at timestamptz,
  enrolled_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_applications TO authenticated;
GRANT ALL ON public.waitlist_applications TO service_role;
ALTER TABLE public.waitlist_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage waitlist"
  ON public.waitlist_applications FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE INDEX IF NOT EXISTS idx_waitlist_org_status ON public.waitlist_applications(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_score ON public.waitlist_applications(organization_id, vulnerability_score DESC);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_pkg_touch ON public.sponsorship_packages;
CREATE TRIGGER trg_pkg_touch BEFORE UPDATE ON public.sponsorship_packages
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_pkg_item_touch ON public.sponsorship_package_items;
CREATE TRIGGER trg_pkg_item_touch BEFORE UPDATE ON public.sponsorship_package_items
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_waitlist_touch ON public.waitlist_applications;
CREATE TRIGGER trg_waitlist_touch BEFORE UPDATE ON public.waitlist_applications
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
