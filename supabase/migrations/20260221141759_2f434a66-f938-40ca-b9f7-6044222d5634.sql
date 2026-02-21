
-- Data Protection & Compliance Suite

-- Consent records: tracks what each beneficiary has consented to
CREATE TABLE public.consent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_email TEXT,
  consent_type TEXT NOT NULL,
  consent_purpose TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  withdrawal_date TIMESTAMPTZ,
  withdrawal_reason TEXT,
  evidence_url TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data retention policies: org-defined rules for data lifecycle
CREATE TABLE public.data_retention_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  data_category TEXT NOT NULL,
  retention_period_days INTEGER NOT NULL,
  action_on_expiry TEXT NOT NULL DEFAULT 'archive',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data access/deletion requests (GDPR-style Subject Access Requests)
CREATE TABLE public.data_access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  subject_email TEXT,
  subject_identifier TEXT,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  requested_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  completed_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  data_exported BOOLEAN DEFAULT false,
  data_deleted BOOLEAN DEFAULT false,
  affected_tables TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance audit exports log
CREATE TABLE public.compliance_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  exported_by UUID REFERENCES auth.users(id),
  record_count INTEGER DEFAULT 0,
  file_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_consent_records_org ON public.consent_records(organization_id);
CREATE INDEX idx_consent_records_beneficiary ON public.consent_records(beneficiary_id);
CREATE INDEX idx_consent_records_status ON public.consent_records(status);
CREATE INDEX idx_data_retention_org ON public.data_retention_policies(organization_id);
CREATE INDEX idx_data_access_requests_org ON public.data_access_requests(organization_id);
CREATE INDEX idx_data_access_requests_status ON public.data_access_requests(status);
CREATE INDEX idx_compliance_exports_org ON public.compliance_exports(organization_id);

-- Enable RLS
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_exports ENABLE ROW LEVEL SECURITY;

-- RLS: consent_records
CREATE POLICY "Users can view consent records in their org"
  ON public.consent_records FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert consent records in their org"
  ON public.consent_records FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update consent records in their org"
  ON public.consent_records FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete consent records"
  ON public.consent_records FOR DELETE TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'management', 'owner')
  );

-- RLS: data_retention_policies
CREATE POLICY "Users can view retention policies in their org"
  ON public.data_retention_policies FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can manage retention policies"
  ON public.data_retention_policies FOR INSERT TO authenticated
  WITH CHECK (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'management', 'owner')
  );

CREATE POLICY "Admins can update retention policies"
  ON public.data_retention_policies FOR UPDATE TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'management', 'owner')
  );

CREATE POLICY "Admins can delete retention policies"
  ON public.data_retention_policies FOR DELETE TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'management', 'owner')
  );

-- RLS: data_access_requests
CREATE POLICY "Users can view data requests in their org"
  ON public.data_access_requests FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create data requests in their org"
  ON public.data_access_requests FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can update data requests"
  ON public.data_access_requests FOR UPDATE TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'management', 'owner')
  );

-- RLS: compliance_exports
CREATE POLICY "Users can view exports in their org"
  ON public.compliance_exports FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create exports in their org"
  ON public.compliance_exports FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

-- Triggers
CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_retention_policies_updated_at
  BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_access_requests_updated_at
  BEFORE UPDATE ON public.data_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
