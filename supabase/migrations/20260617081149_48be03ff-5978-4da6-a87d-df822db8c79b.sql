
-- 1) Baseline captures
CREATE TABLE public.beneficiary_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.beneficiary_services(id) ON DELETE SET NULL,
  indicator_key TEXT NOT NULL,
  indicator_label TEXT NOT NULL,
  value_numeric NUMERIC,
  value_text TEXT,
  unit TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (organization_id, beneficiary_id, project_id, indicator_key)
);
CREATE INDEX idx_beneficiary_baselines_org_project ON public.beneficiary_baselines (organization_id, project_id);
CREATE INDEX idx_beneficiary_baselines_beneficiary ON public.beneficiary_baselines (beneficiary_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiary_baselines TO authenticated;
GRANT ALL ON public.beneficiary_baselines TO service_role;
ALTER TABLE public.beneficiary_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read baselines"
  ON public.beneficiary_baselines FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "org members insert baselines"
  ON public.beneficiary_baselines FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members update baselines"
  ON public.beneficiary_baselines FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members delete baselines"
  ON public.beneficiary_baselines FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

-- 2) Project-level baseline indicator templates
CREATE TABLE public.project_baseline_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  indicator_key TEXT NOT NULL,
  indicator_label TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('numeric','text','percentage','grade_letter','scale_5')),
  unit TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, indicator_key)
);
CREATE INDEX idx_pbi_project ON public.project_baseline_indicators (project_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_baseline_indicators TO authenticated;
GRANT ALL ON public.project_baseline_indicators TO service_role;
ALTER TABLE public.project_baseline_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read pbi"
  ON public.project_baseline_indicators FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "org members insert pbi"
  ON public.project_baseline_indicators FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members update pbi"
  ON public.project_baseline_indicators FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members delete pbi"
  ON public.project_baseline_indicators FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_pbi_updated_at
  BEFORE UPDATE ON public.project_baseline_indicators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Seed function: insert sector-typical indicator templates for a project
CREATE OR REPLACE FUNCTION public.seed_project_baseline_indicators(_project_id UUID, _sector TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
  _proj_name TEXT;
  _proj_desc TEXT;
  _detected TEXT;
BEGIN
  SELECT organization_id, name, COALESCE(description,'') INTO _org_id, _proj_name, _proj_desc
  FROM public.projects WHERE id = _project_id;
  IF _org_id IS NULL THEN RETURN; END IF;

  _detected := LOWER(COALESCE(_sector, ''));
  IF _detected = '' THEN
    IF (LOWER(_proj_name) ~ 'educat|school|scholar|learn' OR LOWER(_proj_desc) ~ 'educat|school') THEN _detected := 'education';
    ELSIF (LOWER(_proj_name) ~ 'health|clinic|nutrit|medic' OR LOWER(_proj_desc) ~ 'health|clinic') THEN _detected := 'health';
    ELSIF (LOWER(_proj_name) ~ 'liveliho|income|enterpr|business|farm|agric' OR LOWER(_proj_desc) ~ 'liveliho|income') THEN _detected := 'livelihoods';
    ELSIF (LOWER(_proj_name) ~ 'humanit|relief|aid|emerg|food' OR LOWER(_proj_desc) ~ 'humanit|relief|aid|emerg') THEN _detected := 'humanitarian';
    END IF;
  END IF;

  IF _detected = 'education' THEN
    INSERT INTO public.project_baseline_indicators (organization_id, project_id, indicator_key, indicator_label, value_type, unit, required, sort_order) VALUES
      (_org_id, _project_id, 'academic_average', 'Academic average', 'numeric', 'score', false, 1),
      (_org_id, _project_id, 'attendance_rate', 'Attendance rate', 'percentage', '%', false, 2),
      (_org_id, _project_id, 'current_grade', 'Current grade', 'grade_letter', NULL, false, 3)
    ON CONFLICT DO NOTHING;
  ELSIF _detected = 'health' THEN
    INSERT INTO public.project_baseline_indicators (organization_id, project_id, indicator_key, indicator_label, value_type, unit, required, sort_order) VALUES
      (_org_id, _project_id, 'bmi', 'BMI', 'numeric', 'kg/m²', false, 1),
      (_org_id, _project_id, 'recent_clinic_visits', 'Recent clinic visits (12mo)', 'numeric', 'visits', false, 2),
      (_org_id, _project_id, 'vaccination_status', 'Vaccination status', 'text', NULL, false, 3)
    ON CONFLICT DO NOTHING;
  ELSIF _detected = 'livelihoods' THEN
    INSERT INTO public.project_baseline_indicators (organization_id, project_id, indicator_key, indicator_label, value_type, unit, required, sort_order) VALUES
      (_org_id, _project_id, 'monthly_income', 'Monthly income', 'numeric', 'KES', false, 1),
      (_org_id, _project_id, 'household_size', 'Household size', 'numeric', 'people', false, 2),
      (_org_id, _project_id, 'savings_balance', 'Savings balance', 'numeric', 'KES', false, 3)
    ON CONFLICT DO NOTHING;
  ELSIF _detected = 'humanitarian' THEN
    INSERT INTO public.project_baseline_indicators (organization_id, project_id, indicator_key, indicator_label, value_type, unit, required, sort_order) VALUES
      (_org_id, _project_id, 'vulnerability_score', 'Vulnerability score', 'scale_5', NULL, false, 1),
      (_org_id, _project_id, 'dependants', 'Dependants', 'numeric', 'people', false, 2)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_project_baseline_indicators(UUID, TEXT) TO authenticated;

-- 4) Trigger: auto-seed on project create (best-effort by name/description keywords)
CREATE OR REPLACE FUNCTION public.trg_seed_project_baselines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_project_baseline_indicators(NEW.id, NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_seed_baselines
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_project_baselines();

-- 5) Audit trigger for baseline edits (writes only, per guardrail)
CREATE OR REPLACE FUNCTION public.audit_beneficiary_baseline_edits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, old_values, new_values, metadata)
    VALUES ('baseline_edited', 'beneficiary_baseline', NEW.id, auth.uid(),
            to_jsonb(OLD), to_jsonb(NEW),
            jsonb_build_object('indicator_key', NEW.indicator_key, 'project_id', NEW.project_id, 'beneficiary_id', NEW.beneficiary_id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_baseline_edits
  AFTER UPDATE ON public.beneficiary_baselines
  FOR EACH ROW EXECUTE FUNCTION public.audit_beneficiary_baseline_edits();

NOTIFY pgrst, 'reload schema';
