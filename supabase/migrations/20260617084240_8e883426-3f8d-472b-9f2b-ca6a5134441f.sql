
-- =========================================================
-- Indicator translation layer
-- =========================================================

-- 1) program_rollup_indicators
CREATE TABLE IF NOT EXISTS public.program_rollup_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  normalized_scale TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'higher_is_better',
  target_value NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, key),
  CONSTRAINT program_rollup_indicators_scale_chk CHECK (
    normalized_scale IN ('percentage_0_100','count','scale_5','binary')
  ),
  CONSTRAINT program_rollup_indicators_dir_chk CHECK (
    direction IN ('higher_is_better','lower_is_better')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_rollup_indicators TO authenticated;
GRANT ALL ON public.program_rollup_indicators TO service_role;
ALTER TABLE public.program_rollup_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read program_rollup_indicators"
  ON public.program_rollup_indicators FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members write program_rollup_indicators"
  ON public.program_rollup_indicators FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members update program_rollup_indicators"
  ON public.program_rollup_indicators FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members delete program_rollup_indicators"
  ON public.program_rollup_indicators FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_prog_rollup_ind_program ON public.program_rollup_indicators(program_id);
CREATE INDEX IF NOT EXISTS idx_prog_rollup_ind_org ON public.program_rollup_indicators(organization_id);

CREATE TRIGGER trg_prog_rollup_ind_updated_at
  BEFORE UPDATE ON public.program_rollup_indicators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) program_rollup_translations
CREATE TABLE IF NOT EXISTS public.program_rollup_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_rollup_indicator_id UUID NOT NULL REFERENCES public.program_rollup_indicators(id) ON DELETE CASCADE,
  source_project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_indicator_key TEXT NOT NULL,
  source_indicator_id UUID REFERENCES public.indicators(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,
  mapping JSONB NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_rollup_indicator_id, source_project_id, source_indicator_key),
  CONSTRAINT prog_rollup_trans_src_type_chk CHECK (
    source_type IN ('numeric','percentage','grade_letter','scale_5','binary')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_rollup_translations TO authenticated;
GRANT ALL ON public.program_rollup_translations TO service_role;
ALTER TABLE public.program_rollup_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read program_rollup_translations"
  ON public.program_rollup_translations FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members write program_rollup_translations"
  ON public.program_rollup_translations FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members update program_rollup_translations"
  ON public.program_rollup_translations FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members delete program_rollup_translations"
  ON public.program_rollup_translations FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_prog_rollup_trans_ind ON public.program_rollup_translations(program_rollup_indicator_id);
CREATE INDEX IF NOT EXISTS idx_prog_rollup_trans_proj ON public.program_rollup_translations(source_project_id);

CREATE TRIGGER trg_prog_rollup_trans_updated_at
  BEFORE UPDATE ON public.program_rollup_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Seed defaults by sector when a program is created
CREATE OR REPLACE FUNCTION public.seed_program_rollup_indicators(_program_id uuid, _sector text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _name text;
  _desc text;
  _detected text;
BEGIN
  SELECT organization_id, name, COALESCE(description,'') INTO _org_id, _name, _desc
  FROM public.programs WHERE id = _program_id;
  IF _org_id IS NULL THEN RETURN; END IF;

  _detected := LOWER(COALESCE(_sector,''));
  IF _detected = '' THEN
    IF LOWER(_name) ~ 'educat|school|scholar|learn' OR LOWER(_desc) ~ 'educat|school' THEN _detected := 'education';
    ELSIF LOWER(_name) ~ 'health|clinic|nutrit|medic'   OR LOWER(_desc) ~ 'health|clinic'  THEN _detected := 'health';
    ELSIF LOWER(_name) ~ 'liveliho|income|enterpr|farm' OR LOWER(_desc) ~ 'liveliho|income' THEN _detected := 'livelihoods';
    END IF;
  END IF;

  IF _detected = 'education' THEN
    INSERT INTO public.program_rollup_indicators (organization_id, program_id, key, label, description, normalized_scale, direction)
    VALUES
      (_org_id, _program_id, 'overall_academic_performance', 'Overall academic performance', 'Normalized average of project-level academic measures', 'percentage_0_100', 'higher_is_better'),
      (_org_id, _program_id, 'attendance_rate', 'Attendance rate', 'School/program attendance across projects', 'percentage_0_100', 'higher_is_better'),
      (_org_id, _program_id, 'dropout_rate', 'Dropout rate', 'Beneficiary dropout across projects', 'percentage_0_100', 'lower_is_better')
    ON CONFLICT DO NOTHING;
  ELSIF _detected = 'health' THEN
    INSERT INTO public.program_rollup_indicators (organization_id, program_id, key, label, description, normalized_scale, direction)
    VALUES
      (_org_id, _program_id, 'health_outcomes_index', 'Health outcomes index', 'Composite health score across projects', 'percentage_0_100', 'higher_is_better'),
      (_org_id, _program_id, 'vaccination_coverage', 'Vaccination coverage', 'Share of beneficiaries fully vaccinated', 'percentage_0_100', 'higher_is_better')
    ON CONFLICT DO NOTHING;
  ELSIF _detected = 'livelihoods' THEN
    INSERT INTO public.program_rollup_indicators (organization_id, program_id, key, label, description, normalized_scale, direction)
    VALUES
      (_org_id, _program_id, 'income_growth', 'Income growth', 'Average household income growth', 'percentage_0_100', 'higher_is_better'),
      (_org_id, _program_id, 'savings_rate', 'Savings rate', 'Share of beneficiaries saving regularly', 'percentage_0_100', 'higher_is_better')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_seed_program_rollup_indicators()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_program_rollup_indicators(NEW.id, NEW.category);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_programs_seed_rollups ON public.programs;
CREATE TRIGGER trg_programs_seed_rollups
  AFTER INSERT ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_program_rollup_indicators();

NOTIFY pgrst, 'reload schema';
