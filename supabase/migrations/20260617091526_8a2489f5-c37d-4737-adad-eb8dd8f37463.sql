
CREATE TABLE public.project_anomaly_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_paf_org_project ON public.project_anomaly_flags(organization_id, project_id);
CREATE INDEX idx_paf_open ON public.project_anomaly_flags(organization_id) WHERE resolved_at IS NULL;
CREATE UNIQUE INDEX uniq_paf_open_kind ON public.project_anomaly_flags(organization_id, project_id, kind) WHERE resolved_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_anomaly_flags TO authenticated;
GRANT ALL ON public.project_anomaly_flags TO service_role;

ALTER TABLE public.project_anomaly_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read anomaly flags"
  ON public.project_anomaly_flags FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Org members manage anomaly flags"
  ON public.project_anomaly_flags FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_paf_updated_at BEFORE UPDATE ON public.project_anomaly_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.burn_impact_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('monthly','quarterly','yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  burn_rate NUMERIC,
  impact_velocity NUMERIC,
  base_volume NUMERIC,
  budget_base NUMERIC,
  allocated_base NUMERIC,
  indicator_actual NUMERIC,
  indicator_planned NUMERIC,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_bis_project_period ON public.burn_impact_snapshots(organization_id, project_id, period, period_start);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.burn_impact_snapshots TO authenticated;
GRANT ALL ON public.burn_impact_snapshots TO service_role;

ALTER TABLE public.burn_impact_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read burn snapshots"
  ON public.burn_impact_snapshots FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Org members manage burn snapshots"
  ON public.burn_impact_snapshots FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_bis_updated_at BEFORE UPDATE ON public.burn_impact_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
