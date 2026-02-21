
-- ===========================
-- Communication Hub Schema
-- ===========================

-- 1. In-App Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general','alert','campaign','system','task','enrollment')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','success')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- 2. Stakeholder Messages (communication log)
CREATE TABLE public.stakeholder_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  channel TEXT NOT NULL DEFAULT 'internal' CHECK (channel IN ('internal','email','sms','phone','in_person')),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('beneficiary','donor','staff','guardian','other')),
  recipient_id UUID,
  recipient_name TEXT,
  recipient_contact TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft','sent','delivered','failed','received')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stakeholder_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view messages"
  ON public.stakeholder_messages FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can create messages"
  ON public.stakeholder_messages FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can update messages"
  ON public.stakeholder_messages FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX idx_messages_org ON public.stakeholder_messages(organization_id, created_at DESC);

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.stakeholder_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','both')),
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed','cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all','beneficiaries','donors','staff','guardians','custom')),
  target_filters JSONB DEFAULT '{}',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view campaigns"
  ON public.campaigns FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can create campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can update campaigns"
  ON public.campaigns FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can delete campaigns"
  ON public.campaigns FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX idx_campaigns_org ON public.campaigns(organization_id, created_at DESC);

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Campaign Recipients
CREATE TABLE public.campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','bounced')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view recipients"
  ON public.campaign_recipients FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can create recipients"
  ON public.campaign_recipients FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can update recipients"
  ON public.campaign_recipients FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX idx_campaign_recipients ON public.campaign_recipients(campaign_id, status);
