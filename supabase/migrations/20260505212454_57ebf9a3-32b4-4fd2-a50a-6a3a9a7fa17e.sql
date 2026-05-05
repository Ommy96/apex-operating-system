-- Program/Project partner links
CREATE TABLE IF NOT EXISTS public.program_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partner_organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'implementing',
  contribution_type text,
  contribution_value numeric,
  contribution_currency text DEFAULT 'KES',
  mou_reference text,
  mou_start_date date,
  mou_end_date date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (program_id IS NOT NULL OR project_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_program_partners_program ON public.program_partners(program_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_program_partners_project ON public.program_partners(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_program_partners_partner ON public.program_partners(partner_id) WHERE deleted_at IS NULL;

ALTER TABLE public.program_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view program partners" ON public.program_partners FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), org_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members insert program partners" ON public.program_partners FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members update program partners" ON public.program_partners FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members delete program partners" ON public.program_partners FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE TRIGGER update_program_partners_updated_at
  BEFORE UPDATE ON public.program_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stakeholder mapping
CREATE TABLE IF NOT EXISTS public.program_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  organization_name text,
  stakeholder_type text NOT NULL DEFAULT 'community',
  role_title text,
  influence int NOT NULL DEFAULT 3 CHECK (influence BETWEEN 1 AND 5),
  interest int NOT NULL DEFAULT 3 CHECK (interest BETWEEN 1 AND 5),
  engagement_strategy text,
  contact_email text,
  contact_phone text,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (program_id IS NOT NULL OR project_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_program_stakeholders_program ON public.program_stakeholders(program_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_program_stakeholders_project ON public.program_stakeholders(project_id) WHERE deleted_at IS NULL;

ALTER TABLE public.program_stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view stakeholders" ON public.program_stakeholders FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), org_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members insert stakeholders" ON public.program_stakeholders FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members update stakeholders" ON public.program_stakeholders FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members delete stakeholders" ON public.program_stakeholders FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE TRIGGER update_program_stakeholders_updated_at
  BEFORE UPDATE ON public.program_stakeholders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();