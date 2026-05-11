
-- =========================================================================
-- 1A. INDICATOR DATA DICTIONARY + VERSIONING
-- =========================================================================

ALTER TABLE public.indicators
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_notes text,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.indicators(id),
  ADD COLUMN IF NOT EXISTS decision_context text,
  ADD COLUMN IF NOT EXISTS calculation_method text,
  ADD COLUMN IF NOT EXISTS data_source_description text,
  ADD COLUMN IF NOT EXISTS disaggregation_dimensions text[] NOT NULL DEFAULT ARRAY['sex','age_group','location_county']::text[],
  ADD COLUMN IF NOT EXISTS baseline_value numeric(18,4),
  ADD COLUMN IF NOT EXISTS baseline_date date,
  ADD COLUMN IF NOT EXISTS baseline_source text,
  ADD COLUMN IF NOT EXISTS target_value numeric(18,4),
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS reporting_frequency text DEFAULT 'quarterly',
  ADD COLUMN IF NOT EXISTS collection_method text,
  ADD COLUMN IF NOT EXISTS collection_responsibility uuid REFERENCES public.profiles(user_id),
  ADD COLUMN IF NOT EXISTS validation_rule jsonb,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS program_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS logframe_entry_id uuid REFERENCES public.logframe_entries(id),
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS retired_at timestamptz,
  ADD COLUMN IF NOT EXISTS retired_reason text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(user_id);

-- Validation triggers (avoid CHECK constraints per project conventions)
CREATE OR REPLACE FUNCTION public.validate_indicator_dictionary()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reporting_frequency IS NOT NULL
     AND NEW.reporting_frequency NOT IN ('weekly','monthly','quarterly','biannual','annual','event_based') THEN
    RAISE EXCEPTION 'Invalid reporting_frequency: %', NEW.reporting_frequency;
  END IF;
  IF NEW.level IS NOT NULL
     AND NEW.level NOT IN ('output','outcome','impact','process') THEN
    RAISE EXCEPTION 'Invalid indicator level: %', NEW.level;
  END IF;
  IF NEW.publish_status NOT IN ('draft','published','retired') THEN
    RAISE EXCEPTION 'Invalid publish_status: %', NEW.publish_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_indicator_dictionary ON public.indicators;
CREATE TRIGGER trg_validate_indicator_dictionary
BEFORE INSERT OR UPDATE ON public.indicators
FOR EACH ROW EXECUTE FUNCTION public.validate_indicator_dictionary();

-- Version history snapshots
CREATE TABLE IF NOT EXISTS public.indicator_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indicator_id uuid NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  version integer NOT NULL,
  name text NOT NULL,
  definition text,
  calculation_method text,
  unit text,
  target_value numeric(18,4),
  baseline_value numeric(18,4),
  disaggregation_dimensions text[],
  changed_by uuid REFERENCES public.profiles(user_id),
  change_reason text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indicator_versions_indicator ON public.indicator_versions(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_versions_org ON public.indicator_versions(organization_id);

ALTER TABLE public.indicator_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "indicator_versions_select_org"
  ON public.indicator_versions FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "indicator_versions_insert_org"
  ON public.indicator_versions FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- 1B. CONFIGURABLE FORMS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.me_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  form_purpose text,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  deployed_to_roles text[] NOT NULL DEFAULT ARRAY['field_officer']::text[],
  requires_beneficiary_link boolean NOT NULL DEFAULT true,
  requires_location boolean NOT NULL DEFAULT false,
  requires_photo boolean NOT NULL DEFAULT false,
  allow_offline boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(user_id),
  updated_by uuid REFERENCES public.profiles(user_id),
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE OR REPLACE FUNCTION public.validate_me_form_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('draft','active','retired') THEN
    RAISE EXCEPTION 'Invalid form status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_me_form_status ON public.me_forms;
CREATE TRIGGER trg_validate_me_form_status
BEFORE INSERT OR UPDATE ON public.me_forms
FOR EACH ROW EXECUTE FUNCTION public.validate_me_form_status();

CREATE TABLE IF NOT EXISTS public.me_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.me_forms(id) ON DELETE CASCADE,
  field_label text NOT NULL,
  field_key text NOT NULL,
  field_type text NOT NULL,
  field_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  validation_rule text,
  helper_text text,
  linked_indicator_id uuid REFERENCES public.indicators(id) ON DELETE SET NULL,
  maps_to_column text,
  display_order integer NOT NULL DEFAULT 0,
  depends_on_field_id uuid REFERENCES public.me_form_fields(id) ON DELETE SET NULL,
  depends_on_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_me_form_field_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.field_type NOT IN (
    'text','number','decimal','date','datetime',
    'select','multiselect','boolean','photo',
    'document','beneficiary_link','location',
    'scale','calculated','section_header'
  ) THEN
    RAISE EXCEPTION 'Invalid field_type: %', NEW.field_type;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_me_form_field_type ON public.me_form_fields;
CREATE TRIGGER trg_validate_me_form_field_type
BEFORE INSERT OR UPDATE ON public.me_form_fields
FOR EACH ROW EXECUTE FUNCTION public.validate_me_form_field_type();

CREATE INDEX IF NOT EXISTS idx_me_form_fields_form ON public.me_form_fields(form_id);

CREATE TABLE IF NOT EXISTS public.me_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.me_forms(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES public.profiles(user_id),
  beneficiary_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  submission_date date NOT NULL DEFAULT CURRENT_DATE,
  location_county text,
  location_sub_county text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_quality_flags text[] NOT NULL DEFAULT '{}'::text[],
  is_synced boolean NOT NULL DEFAULT true,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  updated_by uuid REFERENCES public.profiles(user_id)
);

CREATE INDEX IF NOT EXISTS idx_me_form_submissions_form ON public.me_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_me_form_submissions_org ON public.me_form_submissions(organization_id);

-- =========================================================================
-- 1C. CASE MANAGEMENT
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.beneficiary_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id uuid NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  case_number text,
  case_type text NOT NULL,
  case_status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  opened_date date NOT NULL DEFAULT CURRENT_DATE,
  assigned_to uuid REFERENCES public.profiles(user_id),
  closed_date date,
  closure_reason text,
  summary text,
  created_by uuid REFERENCES public.profiles(user_id),
  updated_by uuid REFERENCES public.profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE OR REPLACE FUNCTION public.validate_beneficiary_case()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.case_type NOT IN ('general_support','protection','health','education','livelihoods','emergency','referral','follow_up','other') THEN
    RAISE EXCEPTION 'Invalid case_type: %', NEW.case_type;
  END IF;
  IF NEW.case_status NOT IN ('open','in_progress','referred','resolved','closed','lost_to_follow_up') THEN
    RAISE EXCEPTION 'Invalid case_status: %', NEW.case_status;
  END IF;
  IF NEW.priority NOT IN ('low','normal','high','critical') THEN
    RAISE EXCEPTION 'Invalid priority: %', NEW.priority;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_beneficiary_case ON public.beneficiary_cases;
CREATE TRIGGER trg_validate_beneficiary_case
BEFORE INSERT OR UPDATE ON public.beneficiary_cases
FOR EACH ROW EXECUTE FUNCTION public.validate_beneficiary_case();

CREATE INDEX IF NOT EXISTS idx_beneficiary_cases_beneficiary ON public.beneficiary_cases(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_cases_org_status ON public.beneficiary_cases(organization_id, case_status);

CREATE TABLE IF NOT EXISTS public.case_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.beneficiary_cases(id) ON DELETE CASCADE,
  beneficiary_id uuid NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  entry_type text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  visit_type text,
  location_county text,
  location_sub_county text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  summary text NOT NULL,
  structured_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  concern_level text,
  action_required text,
  follow_up_date date,
  follow_up_completed boolean NOT NULL DEFAULT false,
  follow_up_completed_date date,
  referral_to text,
  referral_organisation text,
  referral_date date,
  referral_outcome text,
  linked_activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  linked_form_submission_id uuid REFERENCES public.me_form_submissions(id) ON DELETE SET NULL,
  photos text[] NOT NULL DEFAULT '{}'::text[],
  documents text[] NOT NULL DEFAULT '{}'::text[],
  entered_by uuid NOT NULL REFERENCES public.profiles(user_id),
  reviewed_by uuid REFERENCES public.profiles(user_id),
  reviewed_at timestamptz,
  updated_by uuid REFERENCES public.profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE OR REPLACE FUNCTION public.validate_case_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.entry_type NOT IN ('visit','observation','concern','referral','follow_up','service_delivered','outcome_recorded','note','status_change','document_uploaded') THEN
    RAISE EXCEPTION 'Invalid entry_type: %', NEW.entry_type;
  END IF;
  IF NEW.visit_type IS NOT NULL AND NEW.visit_type NOT IN ('home_visit','school_visit','clinic_visit','community_meeting','phone_call','office_visit','field_activity','other') THEN
    RAISE EXCEPTION 'Invalid visit_type: %', NEW.visit_type;
  END IF;
  IF NEW.concern_level IS NOT NULL AND NEW.concern_level NOT IN ('none','low','medium','high','critical') THEN
    RAISE EXCEPTION 'Invalid concern_level: %', NEW.concern_level;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_case_entry ON public.case_entries;
CREATE TRIGGER trg_validate_case_entry
BEFORE INSERT OR UPDATE ON public.case_entries
FOR EACH ROW EXECUTE FUNCTION public.validate_case_entry();

CREATE INDEX IF NOT EXISTS idx_case_entries_case ON public.case_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_case_entries_beneficiary ON public.case_entries(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_case_entries_followup ON public.case_entries(organization_id, follow_up_date) WHERE follow_up_completed = false AND follow_up_date IS NOT NULL;

-- =========================================================================
-- 1D. DATA QUALITY FLAGS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.data_quality_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  flag_type text NOT NULL,
  flag_severity text NOT NULL DEFAULT 'warning',
  flag_message text NOT NULL,
  flagged_by text NOT NULL DEFAULT 'system',
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES public.profiles(user_id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_data_quality_flag()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.entity_type NOT IN ('beneficiary','activity','indicator_value','form_submission','case_entry','visit') THEN
    RAISE EXCEPTION 'Invalid entity_type: %', NEW.entity_type;
  END IF;
  IF NEW.flag_severity NOT IN ('info','warning','error') THEN
    RAISE EXCEPTION 'Invalid flag_severity: %', NEW.flag_severity;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_data_quality_flag ON public.data_quality_flags;
CREATE TRIGGER trg_validate_data_quality_flag
BEFORE INSERT OR UPDATE ON public.data_quality_flags
FOR EACH ROW EXECUTE FUNCTION public.validate_data_quality_flag();

CREATE INDEX IF NOT EXISTS idx_dq_flags_unresolved ON public.data_quality_flags(organization_id) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_dq_flags_entity ON public.data_quality_flags(entity_type, entity_id);

-- =========================================================================
-- 1E. STAKEHOLDER ACCESS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.stakeholder_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  stakeholder_type text NOT NULL,
  access_level text NOT NULL DEFAULT 'summary',
  allowed_program_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  allowed_grant_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  can_view_beneficiary_data boolean NOT NULL DEFAULT false,
  can_download_reports boolean NOT NULL DEFAULT true,
  access_token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  token_expires_at timestamptz,
  last_accessed_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(user_id),
  updated_by uuid REFERENCES public.profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_stakeholder_access()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.stakeholder_type NOT IN ('donor','sponsor','board_member','partner','government','auditor','other') THEN
    RAISE EXCEPTION 'Invalid stakeholder_type: %', NEW.stakeholder_type;
  END IF;
  IF NEW.access_level NOT IN ('summary','detailed','full') THEN
    RAISE EXCEPTION 'Invalid access_level: %', NEW.access_level;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_stakeholder_access ON public.stakeholder_access;
CREATE TRIGGER trg_validate_stakeholder_access
BEFORE INSERT OR UPDATE ON public.stakeholder_access
FOR EACH ROW EXECUTE FUNCTION public.validate_stakeholder_access();

CREATE INDEX IF NOT EXISTS idx_stakeholder_access_token ON public.stakeholder_access(access_token) WHERE is_active = true;

-- =========================================================================
-- TIMESTAMP TRIGGERS
-- =========================================================================
DROP TRIGGER IF EXISTS trg_me_forms_updated ON public.me_forms;
CREATE TRIGGER trg_me_forms_updated BEFORE UPDATE ON public.me_forms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_me_form_fields_updated ON public.me_form_fields;
CREATE TRIGGER trg_me_form_fields_updated BEFORE UPDATE ON public.me_form_fields
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_me_form_submissions_updated ON public.me_form_submissions;
CREATE TRIGGER trg_me_form_submissions_updated BEFORE UPDATE ON public.me_form_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_beneficiary_cases_updated ON public.beneficiary_cases;
CREATE TRIGGER trg_beneficiary_cases_updated BEFORE UPDATE ON public.beneficiary_cases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_case_entries_updated ON public.case_entries;
CREATE TRIGGER trg_case_entries_updated BEFORE UPDATE ON public.case_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_stakeholder_access_updated ON public.stakeholder_access;
CREATE TRIGGER trg_stakeholder_access_updated BEFORE UPDATE ON public.stakeholder_access
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- RLS POLICIES
-- =========================================================================

ALTER TABLE public.me_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.me_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.me_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiary_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholder_access ENABLE ROW LEVEL SECURITY;

-- me_forms
CREATE POLICY "me_forms_select" ON public.me_forms FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "me_forms_insert" ON public.me_forms FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "me_forms_update" ON public.me_forms FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "me_forms_delete" ON public.me_forms FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

-- me_form_fields
CREATE POLICY "me_form_fields_select" ON public.me_form_fields FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "me_form_fields_insert" ON public.me_form_fields FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "me_form_fields_update" ON public.me_form_fields FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "me_form_fields_delete" ON public.me_form_fields FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

-- me_form_submissions
CREATE POLICY "me_form_submissions_select" ON public.me_form_submissions FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "me_form_submissions_insert" ON public.me_form_submissions FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "me_form_submissions_update" ON public.me_form_submissions FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

-- beneficiary_cases
CREATE POLICY "beneficiary_cases_select" ON public.beneficiary_cases FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "beneficiary_cases_insert" ON public.beneficiary_cases FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "beneficiary_cases_update" ON public.beneficiary_cases FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

-- case_entries
CREATE POLICY "case_entries_select" ON public.case_entries FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "case_entries_insert" ON public.case_entries FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "case_entries_update" ON public.case_entries FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

-- data_quality_flags
CREATE POLICY "dq_flags_select" ON public.data_quality_flags FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "dq_flags_insert" ON public.data_quality_flags FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "dq_flags_update" ON public.data_quality_flags FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

-- stakeholder_access (admin-only management; public token lookup handled via SECURITY DEFINER RPC in Phase 4)
CREATE POLICY "stakeholder_access_select" ON public.stakeholder_access FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "stakeholder_access_insert" ON public.stakeholder_access FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "stakeholder_access_update" ON public.stakeholder_access FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "stakeholder_access_delete" ON public.stakeholder_access FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
