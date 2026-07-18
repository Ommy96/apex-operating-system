
-- 1) sponsorship_packages
CREATE TABLE public.sponsorship_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsorship_packages TO authenticated;
GRANT ALL ON public.sponsorship_packages TO service_role;
ALTER TABLE public.sponsorship_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read packages" ON public.sponsorship_packages
  FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members write packages" ON public.sponsorship_packages
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE INDEX idx_sponsorship_packages_org ON public.sponsorship_packages(organization_id);

-- 2) sponsorship_package_items
CREATE TABLE public.sponsorship_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.sponsorship_packages(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_label TEXT NOT NULL,
  cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsorship_package_items TO authenticated;
GRANT ALL ON public.sponsorship_package_items TO service_role;
ALTER TABLE public.sponsorship_package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read package items" ON public.sponsorship_package_items
  FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members write package items" ON public.sponsorship_package_items
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE INDEX idx_package_items_pkg ON public.sponsorship_package_items(package_id);

-- 3) waitlist_applications
CREATE TABLE public.waitlist_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  applicant_name TEXT,
  applicant_age INT,
  applicant_location TEXT,
  applicant_notes TEXT,
  guardian_contact TEXT,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'application',
  vulnerability_score INT NOT NULL DEFAULT 0,
  score_details JSONB DEFAULT '{}'::jsonb,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scored_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ,
  matched_package_id UUID REFERENCES public.sponsorship_packages(id) ON DELETE SET NULL,
  matched_donor_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_applications TO authenticated;
GRANT ALL ON public.waitlist_applications TO service_role;
ALTER TABLE public.waitlist_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read waitlist" ON public.waitlist_applications
  FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members write waitlist" ON public.waitlist_applications
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE INDEX idx_waitlist_org_status ON public.waitlist_applications(organization_id, status);
CREATE INDEX idx_waitlist_score ON public.waitlist_applications(organization_id, vulnerability_score DESC);

-- Status validation trigger (no CHECK for future flexibility)
CREATE OR REPLACE FUNCTION public.validate_waitlist_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('application','assessment','scoring','waiting_list','funding_match','enrolled','declined') THEN
    RAISE EXCEPTION 'Invalid waitlist status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_validate_waitlist_status BEFORE INSERT OR UPDATE ON public.waitlist_applications
FOR EACH ROW EXECUTE FUNCTION public.validate_waitlist_status();

-- updated_at triggers
CREATE TRIGGER trg_sponsorship_packages_updated_at BEFORE UPDATE ON public.sponsorship_packages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sponsorship_package_items_updated_at BEFORE UPDATE ON public.sponsorship_package_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_waitlist_applications_updated_at BEFORE UPDATE ON public.waitlist_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Link beneficiary_donors to a package (optional)
ALTER TABLE public.beneficiary_donors
  ADD COLUMN IF NOT EXISTS sponsorship_package_id UUID REFERENCES public.sponsorship_packages(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
