CREATE TABLE public.project_eligibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  source TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('<','<=','=','>=','>','between','in','not_in','is_null','not_null')),
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  points_if_match INT NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX per_org_project_idx ON public.project_eligibility_rules (organization_id, project_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_eligibility_rules TO authenticated;
GRANT ALL ON public.project_eligibility_rules TO service_role;

ALTER TABLE public.project_eligibility_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "per_select" ON public.project_eligibility_rules FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "per_insert" ON public.project_eligibility_rules FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "per_update" ON public.project_eligibility_rules FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "per_delete" ON public.project_eligibility_rules FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_per_updated_at BEFORE UPDATE ON public.project_eligibility_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.beneficiary_eligibility_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 0,
  eligible BOOLEAN NOT NULL DEFAULT false,
  failed_required_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  matched_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (beneficiary_id, project_id)
);
CREATE INDEX bes_org_project_score_idx ON public.beneficiary_eligibility_scores (organization_id, project_id, score DESC);
CREATE INDEX bes_org_benef_idx ON public.beneficiary_eligibility_scores (organization_id, beneficiary_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiary_eligibility_scores TO authenticated;
GRANT ALL ON public.beneficiary_eligibility_scores TO service_role;

ALTER TABLE public.beneficiary_eligibility_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bes_select" ON public.beneficiary_eligibility_scores FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bes_insert" ON public.beneficiary_eligibility_scores FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bes_update" ON public.beneficiary_eligibility_scores FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bes_delete" ON public.beneficiary_eligibility_scores FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

-- Seed sector starter packs when a project is created
CREATE OR REPLACE FUNCTION public.seed_project_eligibility_rules(_project_id uuid, _sector text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid; _name text; _desc text; _detected text;
BEGIN
  SELECT organization_id, name, COALESCE(description,'') INTO _org, _name, _desc
  FROM public.projects WHERE id = _project_id;
  IF _org IS NULL THEN RETURN; END IF;

  _detected := LOWER(COALESCE(_sector,''));
  IF _detected = '' THEN
    IF LOWER(_name) ~ 'educat|school|scholar' OR LOWER(_desc) ~ 'educat|school' THEN _detected := 'education';
    ELSIF LOWER(_name) ~ 'health|clinic|nutrit'   OR LOWER(_desc) ~ 'health|clinic'   THEN _detected := 'health';
    ELSIF LOWER(_name) ~ 'liveliho|income|enterpr' OR LOWER(_desc) ~ 'liveliho|income' THEN _detected := 'livelihoods';
    END IF;
  END IF;

  IF _detected = 'education' THEN
    INSERT INTO public.project_eligibility_rules (organization_id, project_id, name, source, operator, value, points_if_match, required, sort_order) VALUES
      (_org, _project_id, 'Under 18', 'beneficiary.age', '<', '18'::jsonb, 20, true, 1),
      (_org, _project_id, 'Currently in school', 'beneficiary.is_in_school', '=', 'true'::jsonb, 30, true, 2),
      (_org, _project_id, 'Household income < 30,000 KES', 'beneficiary.household_income', '<', '30000'::jsonb, 30, false, 3),
      (_org, _project_id, 'Orphan or vulnerable child', 'beneficiary.is_ovc', '=', 'true'::jsonb, 20, false, 4)
    ON CONFLICT DO NOTHING;
  ELSIF _detected = 'health' THEN
    INSERT INTO public.project_eligibility_rules (organization_id, project_id, name, source, operator, value, points_if_match, required, sort_order) VALUES
      (_org, _project_id, 'Has chronic illness', 'beneficiary.has_chronic_illness', '=', 'true'::jsonb, 30, false, 1),
      (_org, _project_id, 'Under 5 or over 60', 'beneficiary.age', 'in', '[0,1,2,3,4,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80]'::jsonb, 25, false, 2),
      (_org, _project_id, 'Household income < 30,000 KES', 'beneficiary.household_income', '<', '30000'::jsonb, 25, false, 3)
    ON CONFLICT DO NOTHING;
  ELSIF _detected = 'livelihoods' THEN
    INSERT INTO public.project_eligibility_rules (organization_id, project_id, name, source, operator, value, points_if_match, required, sort_order) VALUES
      (_org, _project_id, 'Adult (18+)', 'beneficiary.age', '>=', '18'::jsonb, 20, true, 1),
      (_org, _project_id, 'Unemployed', 'beneficiary.employment_status', '=', '"unemployed"'::jsonb, 30, false, 2),
      (_org, _project_id, 'Household size >= 4', 'beneficiary.household_size', '>=', '4'::jsonb, 20, false, 3),
      (_org, _project_id, 'Household income < 30,000 KES', 'beneficiary.household_income', '<', '30000'::jsonb, 30, false, 4)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_seed_project_eligibility_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_project_eligibility_rules(NEW.id, NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_eligibility_on_project_insert ON public.projects;
CREATE TRIGGER trg_seed_eligibility_on_project_insert
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.trg_seed_project_eligibility_rules();

NOTIFY pgrst, 'reload schema';