-- Out-of-system family contacts for beneficiaries
CREATE TABLE IF NOT EXISTS public.beneficiary_out_of_system_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship_type TEXT,
  phone TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_boosc_beneficiary ON public.beneficiary_out_of_system_contacts(beneficiary_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_boosc_org ON public.beneficiary_out_of_system_contacts(organization_id) WHERE deleted_at IS NULL;

ALTER TABLE public.beneficiary_out_of_system_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view contacts"
  ON public.beneficiary_out_of_system_contacts FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "org members can insert contacts"
  ON public.beneficiary_out_of_system_contacts FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "org members can update contacts"
  ON public.beneficiary_out_of_system_contacts FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "org members can delete contacts"
  ON public.beneficiary_out_of_system_contacts FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE TRIGGER trg_boosc_updated_at
  BEFORE UPDATE ON public.beneficiary_out_of_system_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for beneficiary profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('beneficiary-photos', 'beneficiary-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "beneficiary photos publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'beneficiary-photos');

CREATE POLICY "authenticated can upload beneficiary photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'beneficiary-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated can update beneficiary photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'beneficiary-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated can delete beneficiary photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'beneficiary-photos' AND auth.uid() IS NOT NULL);