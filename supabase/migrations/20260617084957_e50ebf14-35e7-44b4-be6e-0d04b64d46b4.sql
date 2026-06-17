-- Field logs: continuous micro-logs from field staff
CREATE TABLE public.field_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN ('visit','observation','milestone','incident','photo','note','attendance')),
  title TEXT NOT NULL,
  body TEXT,
  photo_urls TEXT[],
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX field_logs_org_project_time_idx ON public.field_logs (organization_id, project_id, logged_at DESC);
CREATE INDEX field_logs_org_benef_time_idx ON public.field_logs (organization_id, beneficiary_id, logged_at DESC);
CREATE INDEX field_logs_category_idx ON public.field_logs (organization_id, category, logged_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_logs TO authenticated;
GRANT ALL ON public.field_logs TO service_role;

ALTER TABLE public.field_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_logs_select" ON public.field_logs FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "field_logs_insert" ON public.field_logs FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND logged_by = auth.uid());
CREATE POLICY "field_logs_update" ON public.field_logs FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND (logged_by = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "field_logs_delete" ON public.field_logs FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND (logged_by = auth.uid() OR public.has_role(auth.uid(),'admin')));

-- Project report drafts (auto quantitative + manual qualitative)
CREATE TABLE public.project_report_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  quantitative JSONB NOT NULL DEFAULT '{}'::jsonb,
  qualitative_summary TEXT,
  qualitative_lessons TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approver_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, period_start, period_end)
);
CREATE INDEX project_report_drafts_org_proj_idx ON public.project_report_drafts (organization_id, project_id, period_end DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_report_drafts TO authenticated;
GRANT ALL ON public.project_report_drafts TO service_role;

ALTER TABLE public.project_report_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prd_select" ON public.project_report_drafts FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "prd_insert" ON public.project_report_drafts FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "prd_update" ON public.project_report_drafts FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "prd_delete" ON public.project_report_drafts FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_prd_updated_at BEFORE UPDATE ON public.project_report_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Program report drafts (roll-up of approved project reports)
CREATE TABLE public.program_report_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  quantitative JSONB NOT NULL DEFAULT '{}'::jsonb,
  qualitative_summary TEXT,
  qualitative_lessons TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  source_project_report_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, period_start, period_end)
);
CREATE INDEX program_report_drafts_org_prog_idx ON public.program_report_drafts (organization_id, program_id, period_end DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_report_drafts TO authenticated;
GRANT ALL ON public.program_report_drafts TO service_role;

ALTER TABLE public.program_report_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prgd_select" ON public.program_report_drafts FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "prgd_insert" ON public.program_report_drafts FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "prgd_update" ON public.program_report_drafts FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "prgd_delete" ON public.program_report_drafts FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_prgd_updated_at BEFORE UPDATE ON public.program_report_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';