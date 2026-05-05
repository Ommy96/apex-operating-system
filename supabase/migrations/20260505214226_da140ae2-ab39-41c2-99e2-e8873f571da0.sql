-- Phase 9: Beneficiary Targeting & Reach
CREATE TABLE IF NOT EXISTS public.program_reach_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  program_id UUID NOT NULL,
  project_id UUID NULL,
  category TEXT NOT NULL,
  segment TEXT NOT NULL,
  location TEXT NULL,
  target_count INTEGER NOT NULL DEFAULT 0,
  period_start DATE NULL,
  period_end DATE NULL,
  notes TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_org ON public.program_reach_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_prt_program ON public.program_reach_targets(program_id);
CREATE INDEX IF NOT EXISTS idx_prt_project ON public.program_reach_targets(project_id);

ALTER TABLE public.program_reach_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage reach targets"
ON public.program_reach_targets
FOR ALL
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_prt_updated_at
BEFORE UPDATE ON public.program_reach_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
