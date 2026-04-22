-- Scheduled analytics report subscriptions
CREATE TABLE public.analytics_report_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  tab TEXT NOT NULL DEFAULT 'overview',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_subs_org ON public.analytics_report_subscriptions(organization_id);
CREATE INDEX idx_analytics_subs_next_send ON public.analytics_report_subscriptions(next_send_at) WHERE is_active = true;

-- Validation trigger (avoid CHECK on enum-like values so we can add later without migration pain)
CREATE OR REPLACE FUNCTION public.validate_analytics_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.frequency NOT IN ('weekly','monthly','quarterly') THEN
    RAISE EXCEPTION 'Invalid frequency: %', NEW.frequency;
  END IF;
  IF NEW.tab NOT IN ('overview','beneficiary','programme','funding','visitation','risk','demographics','forecast','quality') THEN
    RAISE EXCEPTION 'Invalid tab: %', NEW.tab;
  END IF;
  IF array_length(NEW.recipients, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one recipient is required';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_analytics_subscription
BEFORE INSERT OR UPDATE ON public.analytics_report_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.validate_analytics_subscription();

CREATE TRIGGER trg_analytics_subscriptions_updated
BEFORE UPDATE ON public.analytics_report_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log of every send attempt
CREATE TABLE public.analytics_report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.analytics_report_subscriptions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'sent',
  recipients_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_report_runs_sub ON public.analytics_report_runs(subscription_id, sent_at DESC);

-- RLS
ALTER TABLE public.analytics_report_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_report_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view subscriptions"
ON public.analytics_report_subscriptions FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members manage subscriptions"
ON public.analytics_report_subscriptions FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members update subscriptions"
ON public.analytics_report_subscriptions FOR UPDATE
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members delete subscriptions"
ON public.analytics_report_subscriptions FOR DELETE
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members view runs"
ON public.analytics_report_runs FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Service role can write run logs
CREATE POLICY "Service role inserts runs"
ON public.analytics_report_runs FOR INSERT
WITH CHECK (true);