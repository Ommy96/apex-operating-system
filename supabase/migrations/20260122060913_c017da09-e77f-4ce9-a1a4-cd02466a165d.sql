-- ============================================
-- INFERA SYSTEM ADMINISTRATION INFRASTRUCTURE
-- ============================================

-- 1. EXTEND ORGANIZATIONS TABLE FOR BILLING/SUBSCRIPTION
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled', 'past_due')),
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz,
ADD COLUMN IF NOT EXISTS features_enabled jsonb DEFAULT '{"max_users": 5, "max_beneficiaries": 100, "reports_enabled": true, "indicators_enabled": false, "custom_entities": false}'::jsonb,
ADD COLUMN IF NOT EXISTS usage_stats jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_reason text;

-- 2. SYSTEM HEALTH MONITORING TABLE
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL, -- 'api_latency', 'db_connections', 'error_rate', 'storage_usage', etc.
  metric_value numeric NOT NULL,
  unit text, -- 'ms', 'count', 'percent', 'bytes'
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- 3. PLATFORM ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical', 'maintenance')),
  target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'admins', 'organization_owners')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
  category text,
  assigned_to uuid REFERENCES auth.users(id),
  resolution text,
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. SUPPORT TICKET MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  is_internal boolean DEFAULT false, -- Internal notes not visible to user
  attachments jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. API USAGE TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  response_time_ms integer,
  request_size_bytes integer,
  response_size_bytes integer,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. FEATURE FLAGS TABLE
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  flag_name text NOT NULL,
  description text,
  is_enabled boolean DEFAULT false,
  rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_tiers text[] DEFAULT '{}', -- Which subscription tiers have access
  target_organizations uuid[] DEFAULT '{}', -- Specific org overrides
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- ENABLE RLS ON ALL NEW TABLES
-- ============================================

ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- System Health Logs - Super admin only
CREATE POLICY "Super admins can view all health logs"
  ON public.system_health_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert health logs"
  ON public.system_health_logs FOR INSERT
  WITH CHECK (true); -- Allow system/edge functions to insert

-- Platform Announcements - Visible to all authenticated, managed by super admins
CREATE POLICY "All authenticated can view active announcements"
  ON public.platform_announcements FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND 
    is_active = true AND 
    starts_at <= now() AND 
    (ends_at IS NULL OR ends_at > now())
  );

CREATE POLICY "Super admins can manage announcements"
  ON public.platform_announcements FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Support Tickets - Users see own, super admins see all
CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage all tickets"
  ON public.support_tickets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Support Ticket Messages
CREATE POLICY "Users can view messages on own tickets"
  ON public.support_ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    ) AND (NOT is_internal OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Users can add messages to own tickets"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- API Usage Logs - Super admin only
CREATE POLICY "Super admins can view all API logs"
  ON public.api_usage_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert API logs"
  ON public.api_usage_logs FOR INSERT
  WITH CHECK (true);

-- Feature Flags - All authenticated can read, super admins manage
CREATE POLICY "All authenticated can view feature flags"
  ON public.feature_flags FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if organization is within usage limits
CREATE OR REPLACE FUNCTION public.check_org_usage_limit(
  _org_id uuid,
  _limit_type text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_features jsonb;
  current_count integer;
  max_limit integer;
BEGIN
  SELECT features_enabled INTO org_features
  FROM public.organizations
  WHERE id = _org_id;
  
  IF org_features IS NULL THEN
    RETURN false;
  END IF;
  
  IF _limit_type = 'users' THEN
    SELECT COUNT(*) INTO current_count
    FROM public.organization_members
    WHERE organization_id = _org_id;
    max_limit := (org_features->>'max_users')::integer;
  ELSIF _limit_type = 'beneficiaries' THEN
    SELECT COUNT(*) INTO current_count
    FROM (
      SELECT id FROM public.children WHERE organization_id = _org_id
      UNION ALL
      SELECT id FROM public.feeding_program WHERE organization_id = _org_id
      UNION ALL
      SELECT id FROM public.kipawa_sato WHERE organization_id = _org_id
      UNION ALL
      SELECT id FROM public.self_empowerment WHERE organization_id = _org_id
    ) as beneficiaries;
    max_limit := (org_features->>'max_beneficiaries')::integer;
  ELSE
    RETURN true;
  END IF;
  
  RETURN current_count < max_limit;
END;
$$;

-- Get organization subscription details
CREATE OR REPLACE FUNCTION public.get_org_subscription(_org_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'tier', subscription_tier,
    'status', subscription_status,
    'trial_ends_at', trial_ends_at,
    'subscription_started_at', subscription_started_at,
    'subscription_ends_at', subscription_ends_at,
    'features_enabled', features_enabled,
    'is_suspended', suspended_at IS NOT NULL
  )
  FROM public.organizations
  WHERE id = _org_id;
$$;

-- Check if user is super admin (platform level)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_system_health_logs_recorded_at ON public.system_health_logs(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_logs_metric_type ON public.system_health_logs(metric_type);
CREATE INDEX IF NOT EXISTS idx_platform_announcements_active ON public.platform_announcements(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_org ON public.support_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_org ON public.api_usage_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription ON public.organizations(subscription_tier, subscription_status);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe ON public.organizations(stripe_customer_id);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

CREATE TRIGGER update_platform_announcements_updated_at
  BEFORE UPDATE ON public.platform_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SEED DEFAULT FEATURE FLAGS
-- ============================================

INSERT INTO public.feature_flags (flag_key, flag_name, description, is_enabled, target_tiers) VALUES
  ('indicators_engine', 'Indicators Engine', 'Access to the performance indicators and KPI tracking system', true, ARRAY['professional', 'enterprise']),
  ('custom_entities', 'Custom Entities', 'Create custom entity types beyond the default programs', true, ARRAY['enterprise']),
  ('advanced_analytics', 'Advanced Analytics', 'Advanced reporting and data visualization tools', true, ARRAY['professional', 'enterprise']),
  ('api_access', 'API Access', 'Access to REST API for integrations', false, ARRAY['enterprise']),
  ('bulk_import', 'Bulk Import', 'Bulk import data from CSV/Excel files', true, ARRAY['starter', 'professional', 'enterprise']),
  ('white_label', 'White Label', 'Custom branding and white-label options', false, ARRAY['enterprise'])
ON CONFLICT (flag_key) DO NOTHING;