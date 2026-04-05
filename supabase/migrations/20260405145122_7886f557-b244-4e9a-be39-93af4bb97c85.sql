
-- 1. project_narrative_reports
CREATE TABLE public.project_narrative_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  author_id UUID REFERENCES public.profiles(user_id),
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  title TEXT NOT NULL,
  achievements TEXT,
  challenges TEXT,
  lessons TEXT,
  next_steps TEXT,
  status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(user_id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.project_narrative_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view narrative reports in their org"
  ON public.project_narrative_reports FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can create narrative reports in their org"
  ON public.project_narrative_reports FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update narrative reports in their org"
  ON public.project_narrative_reports FOR UPDATE
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can delete narrative reports in their org"
  ON public.project_narrative_reports FOR DELETE
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE INDEX idx_narrative_reports_project ON public.project_narrative_reports(project_id);
CREATE INDEX idx_narrative_reports_org ON public.project_narrative_reports(org_id);

-- 2. funding_schedules
CREATE TABLE public.funding_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  grant_id UUID REFERENCES public.grants(id),
  donor_name TEXT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency CHAR(3) DEFAULT 'KES',
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  auto_create_expense BOOLEAN DEFAULT false,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.funding_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view funding schedules in their org"
  ON public.funding_schedules FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can create funding schedules in their org"
  ON public.funding_schedules FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can update funding schedules in their org"
  ON public.funding_schedules FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

CREATE POLICY "Users can delete funding schedules in their org"
  ON public.funding_schedules FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

-- 3. funding_schedule_receipts
CREATE TABLE public.funding_schedule_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.funding_schedules(id) ON DELETE CASCADE,
  amount_received DECIMAL(14,2) NOT NULL,
  currency CHAR(3) DEFAULT 'KES',
  received_date DATE NOT NULL,
  reference TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.funding_schedule_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view receipts via schedule org"
  ON public.funding_schedule_receipts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.funding_schedules fs
    WHERE fs.id = schedule_id AND public.user_belongs_to_org(auth.uid(), fs.org_id)
  ));

CREATE POLICY "Users can create receipts via schedule org"
  ON public.funding_schedule_receipts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.funding_schedules fs
    WHERE fs.id = schedule_id AND public.user_belongs_to_org(auth.uid(), fs.org_id)
  ));

CREATE POLICY "Users can update receipts via schedule org"
  ON public.funding_schedule_receipts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.funding_schedules fs
    WHERE fs.id = schedule_id AND public.user_belongs_to_org(auth.uid(), fs.org_id)
  ));

-- 4. board_report_versions
CREATE TABLE public.board_report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.board_reports(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.board_report_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions via report org"
  ON public.board_report_versions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.board_reports br
    WHERE br.id = report_id AND public.user_belongs_to_org(auth.uid(), br.organization_id)
  ));

CREATE POLICY "Users can create versions via report org"
  ON public.board_report_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.board_reports br
    WHERE br.id = report_id AND public.user_belongs_to_org(auth.uid(), br.organization_id)
  ));

-- 5. risk_reviews
CREATE TABLE public.risk_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  risk_key TEXT NOT NULL,
  risk_severity TEXT NOT NULL,
  risk_description TEXT,
  reviewed_by UUID REFERENCES public.profiles(user_id),
  reviewed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.risk_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view risk reviews in their org"
  ON public.risk_reviews FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create risk reviews in their org"
  ON public.risk_reviews FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

-- 6. user_notification_preferences
CREATE TABLE public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  preference_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, org_id, preference_key)
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences"
  ON public.user_notification_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own notification preferences"
  ON public.user_notification_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.user_notification_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 7. saved_report_templates
CREATE TABLE public.saved_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  data_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.saved_report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view report templates in their org"
  ON public.saved_report_templates FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create report templates in their org"
  ON public.saved_report_templates FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update report templates in their org"
  ON public.saved_report_templates FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete report templates in their org"
  ON public.saved_report_templates FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- 8. Add branch_id to organization_members
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

CREATE INDEX IF NOT EXISTS idx_org_members_branch ON public.organization_members(branch_id);

-- 9. Add branch_id to beneficiaries
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_branch ON public.beneficiaries(branch_id);

-- Validation trigger for funding_schedules frequency
CREATE OR REPLACE FUNCTION public.validate_funding_schedule_frequency()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.frequency NOT IN ('monthly','quarterly','biannual','annual','one_off') THEN
    RAISE EXCEPTION 'Invalid frequency: %', NEW.frequency;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_funding_frequency
  BEFORE INSERT OR UPDATE ON public.funding_schedules
  FOR EACH ROW EXECUTE FUNCTION public.validate_funding_schedule_frequency();

-- Validation trigger for narrative report status
CREATE OR REPLACE FUNCTION public.validate_narrative_report_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','submitted','approved') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_narrative_status
  BEFORE INSERT OR UPDATE ON public.project_narrative_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_narrative_report_status();

-- Updated_at triggers
CREATE TRIGGER update_project_narrative_reports_updated_at
  BEFORE UPDATE ON public.project_narrative_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funding_schedules_updated_at
  BEFORE UPDATE ON public.funding_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_prefs_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_report_templates_updated_at
  BEFORE UPDATE ON public.saved_report_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
