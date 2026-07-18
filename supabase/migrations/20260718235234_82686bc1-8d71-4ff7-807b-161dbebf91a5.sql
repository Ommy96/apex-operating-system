
-- Need types catalogue
CREATE TABLE public.need_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  default_cost NUMERIC,
  default_currency TEXT,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.need_types TO authenticated;
GRANT ALL ON public.need_types TO service_role;
ALTER TABLE public.need_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members select need_types" ON public.need_types FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members insert need_types" ON public.need_types FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members update need_types" ON public.need_types FOR UPDATE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members delete need_types" ON public.need_types FOR DELETE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Per-beneficiary needs
CREATE TABLE public.beneficiary_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  need_type_id UUID NOT NULL REFERENCES public.need_types(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'unmet' CHECK (status IN ('unmet','partially_met','met')),
  estimated_cost NUMERIC,
  currency TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  notes TEXT,
  met_by_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  met_by_sponsorship_id UUID REFERENCES public.beneficiary_donors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (beneficiary_id, need_type_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiary_needs TO authenticated;
GRANT ALL ON public.beneficiary_needs TO service_role;
ALTER TABLE public.beneficiary_needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members select beneficiary_needs" ON public.beneficiary_needs FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members insert beneficiary_needs" ON public.beneficiary_needs FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members update beneficiary_needs" ON public.beneficiary_needs FOR UPDATE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members delete beneficiary_needs" ON public.beneficiary_needs FOR DELETE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX idx_beneficiary_needs_beneficiary ON public.beneficiary_needs(beneficiary_id);
CREATE INDEX idx_beneficiary_needs_org ON public.beneficiary_needs(organization_id);
CREATE INDEX idx_need_types_org ON public.need_types(organization_id);

-- updated_at triggers
CREATE TRIGGER trg_need_types_updated_at BEFORE UPDATE ON public.need_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_beneficiary_needs_updated_at BEFORE UPDATE ON public.beneficiary_needs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project → need type
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS addresses_need_type_id UUID REFERENCES public.need_types(id) ON DELETE SET NULL;

-- Package items → need type
ALTER TABLE public.sponsorship_package_items ADD COLUMN IF NOT EXISTS need_type_id UUID REFERENCES public.need_types(id) ON DELETE SET NULL;

-- Seed function
CREATE OR REPLACE FUNCTION public.seed_default_need_types(_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.need_types (organization_id, key, label, description, default_cost, icon, sort_order) VALUES
    (_org_id, 'school_fees', 'School Fees', 'Tuition and school-related fees', 15000, 'GraduationCap', 1),
    (_org_id, 'transport', 'Transport', 'Daily transport to school or services', 3000, 'Bus', 2),
    (_org_id, 'food', 'Food Ration', 'Monthly food or nutrition support', 5000, 'Utensils', 3),
    (_org_id, 'medical', 'Medical Care', 'Medical treatment and health support', 5000, 'Stethoscope', 4),
    (_org_id, 'books', 'Books & Stationery', 'Learning materials', 3000, 'BookOpen', 5),
    (_org_id, 'uniform', 'Uniform', 'School uniform and shoes', 4000, 'Shirt', 6),
    (_org_id, 'shopping', 'Shopping', 'Personal effects and clothing', 3000, 'ShoppingBag', 7),
    (_org_id, 'mentorship', 'Mentorship', 'Mentorship and psychosocial support', NULL, 'Users', 8),
    (_org_id, 'other', 'Other Support', 'Other forms of support', NULL, 'HeartHandshake', 9)
  ON CONFLICT (organization_id, key) DO NOTHING;
END;
$$;

-- Seed for existing orgs
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_need_types(r.id);
  END LOOP;
END $$;

-- Trigger to seed on new org
CREATE OR REPLACE FUNCTION public.trg_seed_need_types_new_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.seed_default_need_types(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_seed_need_types_on_org ON public.organizations;
CREATE TRIGGER trg_seed_need_types_on_org AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.trg_seed_need_types_new_org();

-- Auto-status: enrollment via beneficiary_services
CREATE OR REPLACE FUNCTION public.trg_needs_from_service()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _need_type UUID;
BEGIN
  IF NEW.project_id IS NULL OR NEW.beneficiary_id IS NULL THEN RETURN NEW; END IF;
  SELECT addresses_need_type_id INTO _need_type FROM public.projects WHERE id = NEW.project_id;
  IF _need_type IS NULL THEN RETURN NEW; END IF;
  UPDATE public.beneficiary_needs
    SET status = CASE WHEN status = 'met' THEN 'met' ELSE 'partially_met' END,
        met_by_project_id = COALESCE(met_by_project_id, NEW.project_id)
    WHERE beneficiary_id = NEW.beneficiary_id AND need_type_id = _need_type;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_needs_from_service ON public.beneficiary_services;
CREATE TRIGGER trg_needs_from_service AFTER INSERT OR UPDATE ON public.beneficiary_services FOR EACH ROW EXECUTE FUNCTION public.trg_needs_from_service();

-- Auto-status: sponsorship via beneficiary_donors + sponsorship_package_items.need_type_id
CREATE OR REPLACE FUNCTION public.trg_needs_from_sponsorship()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.sponsorship_package_id IS NULL OR NEW.beneficiary_id IS NULL THEN RETURN NEW; END IF;
  UPDATE public.beneficiary_needs bn
    SET status = 'met',
        met_by_sponsorship_id = COALESCE(bn.met_by_sponsorship_id, NEW.id)
    WHERE bn.beneficiary_id = NEW.beneficiary_id
      AND bn.need_type_id IN (
        SELECT need_type_id FROM public.sponsorship_package_items
         WHERE package_id = NEW.sponsorship_package_id AND need_type_id IS NOT NULL
      );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_needs_from_sponsorship ON public.beneficiary_donors;
CREATE TRIGGER trg_needs_from_sponsorship AFTER INSERT OR UPDATE ON public.beneficiary_donors FOR EACH ROW EXECUTE FUNCTION public.trg_needs_from_sponsorship();

NOTIFY pgrst, 'reload schema';
