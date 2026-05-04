-- Organizations: add missing columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS physical_address text,
  ADD COLUMN IF NOT EXISTS sub_county text,
  ADD COLUMN IF NOT EXISTS year_founded integer,
  ADD COLUMN IF NOT EXISTS ownership_type text,
  ADD COLUMN IF NOT EXISTS incorporation_cert_url text,
  ADD COLUMN IF NOT EXISTS incorporation_cert_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS moa_url text,
  ADD COLUMN IF NOT EXISTS moa_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS annual_returns_url text,
  ADD COLUMN IF NOT EXISTS annual_returns_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS safeguarding_policy_url text,
  ADD COLUMN IF NOT EXISTS safeguarding_policy_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS data_protection_policy_url text,
  ADD COLUMN IF NOT EXISTS data_protection_policy_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS financial_audit_url text,
  ADD COLUMN IF NOT EXISTS financial_audit_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS kra_cert_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS ngo_board_cert_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS pbo_cert_url text,
  ADD COLUMN IF NOT EXISTS pbo_cert_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS fiscal_year_start_month smallint DEFAULT 1,
  ADD COLUMN IF NOT EXISTS budget_approval_threshold numeric DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS expense_approval_threshold numeric DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS session_timeout_minutes integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS require_2fa_admins boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_2fa_all boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_export_non_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS field_officer_sees_all boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_name_in_sidebar boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS dpo_name text,
  ADD COLUMN IF NOT EXISTS dpo_email text,
  ADD COLUMN IF NOT EXISTS indicator_on_track_threshold integer DEFAULT 80,
  ADD COLUMN IF NOT EXISTS indicator_at_risk_threshold integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS overdue_visit_days integer DEFAULT 90,
  ADD COLUMN IF NOT EXISTS require_gps_checkin boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_indicator_frequency text DEFAULT 'quarterly',
  ADD COLUMN IF NOT EXISTS require_indicator_justification boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_narrative_sections jsonb DEFAULT '["achievements","challenges","lessons_learned","next_steps"]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_new_staff_role text DEFAULT 'field_officer',
  ADD COLUMN IF NOT EXISTS email_from_name text,
  ADD COLUMN IF NOT EXISTS email_reply_to text;

-- org_beneficiary_config: add missing columns
ALTER TABLE public.org_beneficiary_config
  ADD COLUMN IF NOT EXISTS minor_age_threshold integer DEFAULT 18,
  ADD COLUMN IF NOT EXISTS require_guardian_for_minors boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS id_prefix text;

-- Org-wide notification preferences (defaults)
CREATE TABLE IF NOT EXISTS public.org_notification_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  preference_key text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('in_app','email','sms')),
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, preference_key, channel)
);

ALTER TABLE public.org_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view org notification prefs" ON public.org_notification_prefs;
CREATE POLICY "Members can view org notification prefs"
  ON public.org_notification_prefs FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Org admins manage notification prefs" ON public.org_notification_prefs;
CREATE POLICY "Org admins manage notification prefs"
  ON public.org_notification_prefs FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = org_notification_prefs.organization_id
        AND om.role = 'admin'
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = org_notification_prefs.organization_id
        AND om.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_org_notif_prefs_org ON public.org_notification_prefs(organization_id);

DROP TRIGGER IF EXISTS trg_org_notif_prefs_updated ON public.org_notification_prefs;
CREATE TRIGGER trg_org_notif_prefs_updated
  BEFORE UPDATE ON public.org_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();