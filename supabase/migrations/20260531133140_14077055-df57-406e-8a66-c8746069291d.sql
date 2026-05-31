
CREATE TABLE IF NOT EXISTS public.grant_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  funder_name text,
  funder_type text,
  url text,
  sectors text[] DEFAULT '{}',
  geographies text[] DEFAULT '{}',
  sdg_focus int[] DEFAULT '{}',
  min_amount numeric,
  max_amount numeric,
  currency text DEFAULT 'USD',
  typical_deadline_month int,
  next_deadline date,
  eligibility_notes text,
  application_url text,
  contact_email text,
  is_active boolean DEFAULT true,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grant_sources TO authenticated;
GRANT ALL ON public.grant_sources TO service_role;
ALTER TABLE public.grant_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grant_sources read" ON public.grant_sources FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "grant_sources insert" ON public.grant_sources FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "grant_sources update" ON public.grant_sources FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "grant_sources delete" ON public.grant_sources FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE INDEX IF NOT EXISTS idx_grant_sources_org ON public.grant_sources(organization_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.grant_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  source_id uuid REFERENCES public.grant_sources(id) ON DELETE SET NULL,
  title text NOT NULL,
  funder_name text,
  summary text,
  match_score int,
  match_reasons jsonb DEFAULT '[]'::jsonb,
  estimated_amount numeric,
  currency text DEFAULT 'USD',
  deadline date,
  url text,
  sectors text[] DEFAULT '{}',
  sdg_focus int[] DEFAULT '{}',
  status text DEFAULT 'discovered',
  ai_payload jsonb,
  saved_grant_id uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grant_opportunities TO authenticated;
GRANT ALL ON public.grant_opportunities TO service_role;
ALTER TABLE public.grant_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grant_opps read" ON public.grant_opportunities FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "grant_opps insert" ON public.grant_opportunities FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "grant_opps update" ON public.grant_opportunities FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "grant_opps delete" ON public.grant_opportunities FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE INDEX IF NOT EXISTS idx_grant_opps_org ON public.grant_opportunities(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grant_opps_status ON public.grant_opportunities(organization_id, status);

CREATE TABLE IF NOT EXISTS public.ai_document_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  document_type text NOT NULL,
  title text NOT NULL,
  program_id uuid,
  project_id uuid,
  grant_id uuid,
  opportunity_id uuid REFERENCES public.grant_opportunities(id) ON DELETE SET NULL,
  content text NOT NULL DEFAULT '',
  status text DEFAULT 'draft',
  model text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_document_drafts TO authenticated;
GRANT ALL ON public.ai_document_drafts TO service_role;
ALTER TABLE public.ai_document_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_drafts read" ON public.ai_document_drafts FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ai_drafts insert" ON public.ai_document_drafts FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "ai_drafts update" ON public.ai_document_drafts FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "ai_drafts delete" ON public.ai_document_drafts FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE INDEX IF NOT EXISTS idx_ai_drafts_org ON public.ai_document_drafts(organization_id) WHERE deleted_at IS NULL;
