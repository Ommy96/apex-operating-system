
CREATE TABLE public.program_comms_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  donor_name TEXT,
  output_type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  channel TEXT,
  planned_date DATE,
  published_date DATE,
  audience_reach INTEGER,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_comms_outputs_org ON public.program_comms_outputs(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comms_outputs_program ON public.program_comms_outputs(program_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comms_outputs_project ON public.program_comms_outputs(project_id) WHERE deleted_at IS NULL;

ALTER TABLE public.program_comms_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view comms outputs"
ON public.program_comms_outputs FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members create comms outputs"
ON public.program_comms_outputs FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members update comms outputs"
ON public.program_comms_outputs FOR UPDATE
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members delete comms outputs"
ON public.program_comms_outputs FOR DELETE
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_program_comms_outputs_updated_at
BEFORE UPDATE ON public.program_comms_outputs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
