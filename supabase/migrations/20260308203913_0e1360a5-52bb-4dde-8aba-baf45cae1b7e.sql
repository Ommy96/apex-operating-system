
-- Donor accounts table: links auth users to donor identities
CREATE TABLE public.donor_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  donor_name TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Add donor_visible flag to managed_documents
ALTER TABLE public.managed_documents 
ADD COLUMN IF NOT EXISTS donor_visible BOOLEAN DEFAULT false;

-- Add document_type for categorizing donor-facing documents
ALTER TABLE public.managed_documents 
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'general';

-- Enable RLS
ALTER TABLE public.donor_accounts ENABLE ROW LEVEL SECURITY;

-- RLS: Org members can manage donor accounts
CREATE POLICY "Org members can view donor accounts"
  ON public.donor_accounts FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Org admins can manage donor accounts"
  ON public.donor_accounts FOR ALL TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS: Donors can view documents marked as donor_visible
CREATE POLICY "Donors can view donor-visible documents"
  ON public.managed_documents FOR SELECT TO authenticated
  USING (
    donor_visible = true 
    AND EXISTS (
      SELECT 1 FROM public.donor_accounts da 
      WHERE da.user_id = auth.uid() 
      AND da.organization_id = managed_documents.organization_id
      AND da.is_active = true
    )
  );

-- RLS: Donors can view beneficiary data for their sponsored beneficiaries
CREATE POLICY "Donors can view sponsored beneficiaries"
  ON public.beneficiaries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.donor_accounts da
      JOIN public.beneficiary_donors bd ON bd.organization_id = da.organization_id
      WHERE da.user_id = auth.uid()
        AND da.is_active = true
        AND bd.beneficiary_id = beneficiaries.id
        AND bd.donor_name = da.donor_name
    )
  );

-- RLS: Donors can view academics for their sponsored beneficiaries
CREATE POLICY "Donors can view sponsored beneficiary academics"
  ON public.beneficiary_academics FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.donor_accounts da
      JOIN public.beneficiary_donors bd ON bd.organization_id = da.organization_id
      WHERE da.user_id = auth.uid()
        AND da.is_active = true
        AND bd.beneficiary_id = beneficiary_academics.beneficiary_id
        AND bd.donor_name = da.donor_name
    )
  );

-- RLS: Donors can view progression history for their sponsored beneficiaries
CREATE POLICY "Donors can view sponsored beneficiary progression"
  ON public.beneficiary_progression_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.donor_accounts da
      JOIN public.beneficiary_donors bd ON bd.organization_id = da.organization_id
      WHERE da.user_id = auth.uid()
        AND da.is_active = true
        AND bd.beneficiary_id = beneficiary_progression_history.beneficiary_id
        AND bd.donor_name = da.donor_name
    )
  );

-- RLS: Donors can view document versions for donor-visible documents
CREATE POLICY "Donors can view donor-visible document versions"
  ON public.document_versions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.managed_documents md
      JOIN public.donor_accounts da ON da.organization_id = md.organization_id
      WHERE md.id = document_versions.document_id
        AND md.donor_visible = true
        AND da.user_id = auth.uid()
        AND da.is_active = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_donor_accounts_updated_at
  BEFORE UPDATE ON public.donor_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
