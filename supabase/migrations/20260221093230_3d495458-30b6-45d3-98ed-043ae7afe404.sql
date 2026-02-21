
-- =============================================
-- AUTOMATION ENGINE MODULE
-- =============================================

-- 1. Automation Rules (Workflow Triggers)
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Automation Execution Logs
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  rule_name TEXT,
  trigger_event TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}',
  actions_executed JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','partial')),
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Smart Alert Rules
CREATE TABLE public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('budget','staff','beneficiary','program','compliance','general')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  condition_type TEXT NOT NULL,
  condition_config JSONB DEFAULT '{}',
  notification_channels TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  cooldown_hours INT DEFAULT 24,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Alert Instances (triggered alerts)
CREATE TABLE public.alert_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  category TEXT DEFAULT 'general',
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Donor Report Templates
CREATE TABLE public.donor_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'quarterly' CHECK (template_type IN ('monthly','quarterly','annual','custom')),
  sections JSONB DEFAULT '[]',
  include_financials BOOLEAN DEFAULT true,
  include_beneficiary_stats BOOLEAN DEFAULT true,
  include_program_progress BOOLEAN DEFAULT true,
  include_photos BOOLEAN DEFAULT false,
  donor_name TEXT,
  program_id UUID REFERENCES public.programs(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Donor Report Runs (generated reports)
CREATE TABLE public.donor_report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.donor_report_templates(id) ON DELETE SET NULL,
  template_name TEXT,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  generated_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','completed','sent','failed')),
  generated_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,
  sent_to TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_report_runs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================
CREATE POLICY "Org members can view automation rules" ON public.automation_rules FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org members can manage automation rules" ON public.automation_rules FOR ALL TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can view automation logs" ON public.automation_logs FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org members can insert automation logs" ON public.automation_logs FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can view alert rules" ON public.alert_rules FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org members can manage alert rules" ON public.alert_rules FOR ALL TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can view alert instances" ON public.alert_instances FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org members can manage alert instances" ON public.alert_instances FOR ALL TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can view report templates" ON public.donor_report_templates FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org members can manage report templates" ON public.donor_report_templates FOR ALL TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can view report runs" ON public.donor_report_runs FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org members can manage report runs" ON public.donor_report_runs FOR ALL TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- =============================================
-- TRIGGERS & INDEXES
-- =============================================
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON public.alert_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_donor_report_templates_updated_at BEFORE UPDATE ON public.donor_report_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_donor_report_runs_updated_at BEFORE UPDATE ON public.donor_report_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_automation_rules_org ON public.automation_rules(organization_id);
CREATE INDEX idx_automation_logs_org ON public.automation_logs(organization_id);
CREATE INDEX idx_automation_logs_rule ON public.automation_logs(rule_id);
CREATE INDEX idx_alert_rules_org ON public.alert_rules(organization_id);
CREATE INDEX idx_alert_instances_org ON public.alert_instances(organization_id);
CREATE INDEX idx_alert_instances_unread ON public.alert_instances(organization_id, is_read) WHERE is_read = false;
CREATE INDEX idx_donor_report_templates_org ON public.donor_report_templates(organization_id);
CREATE INDEX idx_donor_report_runs_org ON public.donor_report_runs(organization_id);
