
CREATE TABLE public.program_sustainability_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  vision TEXT,
  exit_strategy_summary TEXT,
  target_handover_date DATE,
  post_exit_owner TEXT,
  ownership_model TEXT,
  financial_sustainability_notes TEXT,
  capacity_transfer_notes TEXT,
  risks_to_continuity TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.program_sustainability_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  responsible_party TEXT,
  due_date DATE,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'not_started',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sus_plans_org ON public.program_sustainability_plans(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sus_plans_program ON public.program_sustainability_plans(program_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sus_plans_project ON public.program_sustainability_plans(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sus_milestones_org ON public.program_sustainability_milestones(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sus_milestones_program ON public.program_sustainability_milestones(program_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sus_milestones_project ON public.program_sustainability_milestones(project_id) WHERE deleted_at IS NULL;

ALTER TABLE public.program_sustainability_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_sustainability_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view sus plans"
ON public.program_sustainability_plans FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members create sus plans"
ON public.program_sustainability_plans FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members update sus plans"
ON public.program_sustainability_plans FOR UPDATE
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members delete sus plans"
ON public.program_sustainability_plans FOR DELETE
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members view sus milestones"
ON public.program_sustainability_milestones FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members create sus milestones"
ON public.program_sustainability_milestones FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members update sus milestones"
ON public.program_sustainability_milestones FOR UPDATE
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members delete sus milestones"
ON public.program_sustainability_milestones FOR DELETE
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_program_sustainability_plans_updated_at
BEFORE UPDATE ON public.program_sustainability_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_program_sustainability_milestones_updated_at
BEFORE UPDATE ON public.program_sustainability_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
