-- =====================================================================
-- PART 1: UNIVERSAL BENEFICIARY MODEL
-- =====================================================================

-- 1a. Households table
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  household_name TEXT,
  head_of_household_id UUID,
  county TEXT,
  sub_county TEXT,
  village TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  household_size INTEGER,
  vulnerability_score INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_households_org ON public.households(organization_id);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view households"
  ON public.households FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org members can insert households"
  ON public.households FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org members can update households"
  ON public.households FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org members can delete households"
  ON public.households FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1b. Org beneficiary configuration
CREATE TABLE IF NOT EXISTS public.org_beneficiary_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  org_type TEXT NOT NULL DEFAULT 'general'
    CHECK (org_type IN ('education','health','livelihood','disaster_response','refugee','elderly','disability','child_welfare','general','other')),
  collect_education_data BOOLEAN NOT NULL DEFAULT true,
  collect_health_data BOOLEAN NOT NULL DEFAULT true,
  collect_economic_data BOOLEAN NOT NULL DEFAULT false,
  collect_household_data BOOLEAN NOT NULL DEFAULT true,
  collect_religion BOOLEAN NOT NULL DEFAULT true,
  collect_hiv_status BOOLEAN NOT NULL DEFAULT false,
  collect_nutritional_status BOOLEAN NOT NULL DEFAULT false,
  collect_disability_details BOOLEAN NOT NULL DEFAULT false,
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_vulnerability_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  beneficiary_terminology TEXT NOT NULL DEFAULT 'Beneficiary',
  beneficiary_terminology_plural TEXT NOT NULL DEFAULT 'Beneficiaries',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_beneficiary_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their config"
  ON public.org_beneficiary_config FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org admins can insert config"
  ON public.org_beneficiary_config FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org admins can update config"
  ON public.org_beneficiary_config FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_org_beneficiary_config_updated_at
  BEFORE UPDATE ON public.org_beneficiary_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default config for all existing organizations
INSERT INTO public.org_beneficiary_config (organization_id, org_type)
SELECT id, 'general' FROM public.organizations
WHERE id NOT IN (SELECT organization_id FROM public.org_beneficiary_config);

-- 1c. Programme custom field configuration
CREATE TABLE IF NOT EXISTS public.programme_field_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text','number','date','select','multiselect','boolean','textarea')),
  field_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (program_id IS NOT NULL OR project_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pfc_program ON public.programme_field_config(program_id);
CREATE INDEX IF NOT EXISTS idx_pfc_project ON public.programme_field_config(project_id);

ALTER TABLE public.programme_field_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view programme field config"
  ON public.programme_field_config FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org members can manage programme field config"
  ON public.programme_field_config FOR ALL
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_programme_field_config_updated_at
  BEFORE UPDATE ON public.programme_field_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1d. Beneficiary custom field values
CREATE TABLE IF NOT EXISTS public.beneficiary_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  field_config_id UUID NOT NULL REFERENCES public.programme_field_config(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (beneficiary_id, field_config_id)
);

CREATE INDEX IF NOT EXISTS idx_bfv_beneficiary ON public.beneficiary_field_values(beneficiary_id);

ALTER TABLE public.beneficiary_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view beneficiary field values"
  ON public.beneficiary_field_values FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Org members can manage beneficiary field values"
  ON public.beneficiary_field_values FOR ALL
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_beneficiary_field_values_updated_at
  BEFORE UPDATE ON public.beneficiary_field_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1e. New columns on beneficiaries
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS beneficiary_category TEXT
    CHECK (beneficiary_category IN ('individual','household','group','organisation')),
  ADD COLUMN IF NOT EXISTS vulnerability_tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS vulnerability_level TEXT
    CHECK (vulnerability_level IN ('low','medium','high','critical')),
  ADD COLUMN IF NOT EXISTS primary_need TEXT,
  ADD COLUMN IF NOT EXISTS household_size INTEGER,
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS income_level TEXT
    CHECK (income_level IN ('below_poverty','low','medium','not_assessed')),
  ADD COLUMN IF NOT EXISTS registration_source TEXT DEFAULT 'admin'
    CHECK (registration_source IN ('admin','field_officer','self_referral','partner_referral')),
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_date DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS exit_reason TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS disability_status TEXT,
  ADD COLUMN IF NOT EXISTS family_status TEXT,
  ADD COLUMN IF NOT EXISTS unique_id TEXT;

-- Backfill beneficiary_category from legacy beneficiary_type
UPDATE public.beneficiaries
SET beneficiary_category = CASE
  WHEN beneficiary_type IN ('student','adult') THEN 'individual'
  WHEN beneficiary_type::text = 'group' THEN 'group'
  ELSE 'individual'
END
WHERE beneficiary_category IS NULL;

-- Now add FK for head_of_household_id pointing back to beneficiaries
ALTER TABLE public.households
  DROP CONSTRAINT IF EXISTS households_head_of_household_fkey;

ALTER TABLE public.households
  ADD CONSTRAINT households_head_of_household_fkey
  FOREIGN KEY (head_of_household_id) REFERENCES public.beneficiaries(id) ON DELETE SET NULL;

-- =====================================================================
-- PART 2: DUAL FUNDING MODEL
-- =====================================================================

-- 2a. Projects: funding model fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS funding_model TEXT NOT NULL DEFAULT 'programme'
    CHECK (funding_model IN ('programme','individual_sponsorship','mixed')),
  ADD COLUMN IF NOT EXISTS sponsorship_target_amount DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS sponsorship_currency CHAR(3) DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS allow_partial_sponsorship BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsorship_frequency TEXT DEFAULT 'monthly'
    CHECK (sponsorship_frequency IN ('one_off','monthly','quarterly','annual'));

-- 2b. beneficiary_services: sponsorship fields
ALTER TABLE public.beneficiary_services
  ADD COLUMN IF NOT EXISTS sponsorship_status TEXT DEFAULT 'not_applicable'
    CHECK (sponsorship_status IN ('not_applicable','unsponsored','sponsored','partially_sponsored')),
  ADD COLUMN IF NOT EXISTS sponsor_name TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_donor_id UUID,
  ADD COLUMN IF NOT EXISTS sponsorship_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS sponsorship_currency CHAR(3) DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS sponsorship_start_date DATE,
  ADD COLUMN IF NOT EXISTS sponsorship_end_date DATE,
  ADD COLUMN IF NOT EXISTS sponsorship_notes TEXT;

-- 2c. Grants: supported funding model
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='grants') THEN
    EXECUTE 'ALTER TABLE public.grants
      ADD COLUMN IF NOT EXISTS supported_funding_model TEXT DEFAULT ''programme''
        CHECK (supported_funding_model IN (''programme'',''individual_sponsorship'',''both''))';
  END IF;
END$$;

-- 2d. Funding schedules: link to funding model and individual enrollment
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='funding_schedules') THEN
    EXECUTE 'ALTER TABLE public.funding_schedules
      ADD COLUMN IF NOT EXISTS funding_model TEXT DEFAULT ''programme''
        CHECK (funding_model IN (''programme'',''individual_sponsorship''))';
    EXECUTE 'ALTER TABLE public.funding_schedules
      ADD COLUMN IF NOT EXISTS beneficiary_service_id UUID REFERENCES public.beneficiary_services(id) ON DELETE SET NULL';
  END IF;
END$$;

-- =====================================================================
-- PART 3: HELPER FUNCTION — generate unique beneficiary ID
-- =====================================================================
CREATE OR REPLACE FUNCTION public.generate_beneficiary_unique_id(_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_slug TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  SELECT UPPER(SUBSTRING(COALESCE(slug, 'ORG') FROM 1 FOR 6)) INTO org_slug
  FROM public.organizations WHERE id = _org_id;

  SELECT COALESCE(MAX(CAST(SUBSTRING(unique_id FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.beneficiaries
  WHERE organization_id = _org_id AND unique_id IS NOT NULL;

  result := COALESCE(org_slug,'ORG') || '-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(next_num::TEXT, 6, '0');
  RETURN result;
END;
$$;