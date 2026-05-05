-- Risk Register & Assumptions
CREATE TABLE IF NOT EXISTS public.program_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'operational',
  likelihood int NOT NULL DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  impact int NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  risk_score int GENERATED ALWAYS AS (likelihood * impact) STORED,
  status text NOT NULL DEFAULT 'open',
  mitigation_plan text,
  contingency_plan text,
  owner_id uuid,
  due_date date,
  reviewed_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (program_id IS NOT NULL OR project_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_program_risks_program ON public.program_risks(program_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_program_risks_project ON public.program_risks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_program_risks_org ON public.program_risks(org_id) WHERE deleted_at IS NULL;

ALTER TABLE public.program_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view risks" ON public.program_risks FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), org_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members can insert risks" ON public.program_risks FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members can update risks" ON public.program_risks FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members can delete risks" ON public.program_risks FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE TRIGGER update_program_risks_updated_at
  BEFORE UPDATE ON public.program_risks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assumptions linked to logframe entries
CREATE TABLE IF NOT EXISTS public.logframe_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  logframe_entry_id uuid,
  assumption text NOT NULL,
  validity text NOT NULL DEFAULT 'holding',
  notes text,
  linked_risk_id uuid REFERENCES public.program_risks(id) ON DELETE SET NULL,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_logframe_assumptions_program ON public.logframe_assumptions(program_id) WHERE deleted_at IS NULL;

ALTER TABLE public.logframe_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view assumptions" ON public.logframe_assumptions FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), org_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members can insert assumptions" ON public.logframe_assumptions FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members can update assumptions" ON public.logframe_assumptions FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members can delete assumptions" ON public.logframe_assumptions FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE TRIGGER update_logframe_assumptions_updated_at
  BEFORE UPDATE ON public.logframe_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();