CREATE TABLE public.message_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  channel text NOT NULL CHECK (channel IN ('email','whatsapp','sms','in_app')),
  source text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  recipient_user_id uuid,
  recipient_contact text NOT NULL,
  subject text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  link_path text,
  transactional boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','skipped_quiet_hours','skipped_preference','blocked_sensitive','not_configured')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  provider_message_id text,
  created_by uuid,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX message_deliveries_org_idx ON public.message_deliveries(organization_id, created_at DESC);
GRANT SELECT ON public.message_deliveries TO authenticated;
GRANT ALL ON public.message_deliveries TO service_role;
ALTER TABLE public.message_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view deliveries" ON public.message_deliveries FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.user_communication_settings (
  user_id uuid PRIMARY KEY,
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_start time NOT NULL DEFAULT '21:00',
  quiet_end time NOT NULL DEFAULT '07:00',
  timezone text NOT NULL DEFAULT 'Africa/Nairobi',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_communication_settings TO authenticated;
GRANT ALL ON public.user_communication_settings TO service_role;
ALTER TABLE public.user_communication_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own quiet hours" ON public.user_communication_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';