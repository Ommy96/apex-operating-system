
CREATE TABLE public.donor_report_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  grant_id UUID,
  donor_name TEXT,
  title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  narrative_executive_summary TEXT,
  narrative_challenges TEXT,
  narrative_next_steps TEXT,
  narrative_lessons TEXT,
  snapshot_json JSONB DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_donor_report_packs_org ON public.donor_report_packs(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_donor_report_packs_program ON public.donor_report_packs(program_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_donor_report_packs_project ON public.donor_report_packs(project_id) WHERE deleted_at IS NULL;

ALTER TABLE public.donor_report_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view donor report packs"
ON public.donor_report_packs FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members create donor report packs"
ON public.donor_report_packs FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members update donor report packs"
ON public.donor_report_packs FOR UPDATE
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members delete donor report packs"
ON public.donor_report_packs FOR DELETE
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_donor_report_packs_updated_at
BEFORE UPDATE ON public.donor_report_packs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
