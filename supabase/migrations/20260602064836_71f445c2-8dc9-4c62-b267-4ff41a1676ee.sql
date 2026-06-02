
-- ===== Donation Campaigns =====
CREATE TABLE public.donation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  story TEXT,
  image_url TEXT,
  target_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'active',
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  raised_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  donor_count INTEGER NOT NULL DEFAULT 0,
  end_date DATE,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

GRANT SELECT ON public.donation_campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donation_campaigns TO authenticated;
GRANT ALL ON public.donation_campaigns TO service_role;

ALTER TABLE public.donation_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active campaigns"
  ON public.donation_campaigns FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "Org members manage campaigns"
  ON public.donation_campaigns FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_donation_campaigns_updated
  BEFORE UPDATE ON public.donation_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_donation_campaigns_org ON public.donation_campaigns(organization_id);
CREATE INDEX idx_donation_campaigns_slug ON public.donation_campaigns(organization_id, slug);

-- ===== Donations (public donation records) =====
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.donation_campaigns(id) ON DELETE SET NULL,
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  provider TEXT NOT NULL DEFAULT 'mpesa',
  provider_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT INSERT ON public.donations TO anon;
GRANT ALL ON public.donations TO service_role;

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can create pending donations"
  ON public.donations FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE POLICY "Org members view donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members manage donations"
  ON public.donations FOR UPDATE
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_donations_updated
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_donations_org ON public.donations(organization_id);
CREATE INDEX idx_donations_campaign ON public.donations(campaign_id);

-- ===== Roll up completed donations into campaign totals =====
CREATE OR REPLACE FUNCTION public.update_campaign_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL AND NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.donation_campaigns
    SET raised_amount = raised_amount + NEW.amount,
        donor_count = donor_count + 1
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_donations_rollup
  AFTER INSERT OR UPDATE OF status ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_campaign_totals();

-- ===== Sponsorship Updates (letters/photos/videos/reports) =====
CREATE TABLE public.sponsorship_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  donor_name TEXT,
  update_type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  scheduled_for DATE,
  sent_at TIMESTAMPTZ,
  visible_to_donor BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsorship_updates TO authenticated;
GRANT ALL ON public.sponsorship_updates TO service_role;

ALTER TABLE public.sponsorship_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage sponsorship updates"
  ON public.sponsorship_updates FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

-- Donors can read updates for their sponsored beneficiaries
CREATE POLICY "Donors view their sponsorship updates"
  ON public.sponsorship_updates FOR SELECT
  TO authenticated
  USING (
    visible_to_donor = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.donor_accounts da
      JOIN public.beneficiary_donors bd
        ON bd.organization_id = da.organization_id
       AND lower(bd.donor_name) = lower(da.donor_name)
      WHERE da.user_id = auth.uid()
        AND da.is_active = true
        AND bd.beneficiary_id = sponsorship_updates.beneficiary_id
    )
  );

CREATE TRIGGER trg_sponsorship_updates_updated
  BEFORE UPDATE ON public.sponsorship_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sponsorship_updates_beneficiary ON public.sponsorship_updates(beneficiary_id);
CREATE INDEX idx_sponsorship_updates_org ON public.sponsorship_updates(organization_id);
