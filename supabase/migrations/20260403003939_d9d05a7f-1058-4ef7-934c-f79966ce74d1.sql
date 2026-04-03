
-- ===== COMPLAINTS TABLE =====
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  submitted_by_name TEXT,
  submitted_by_contact TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view complaints" ON public.complaints
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can create complaints" ON public.complaints
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users with permission can update complaints" ON public.complaints
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Public can submit complaints" ON public.complaints
  FOR INSERT TO anon
  WITH CHECK (true);

-- ===== SAFEGUARDING INCIDENTS TABLE =====
CREATE TABLE public.safeguarding_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporter_id UUID,
  incident_date DATE NOT NULL,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  persons_involved TEXT,
  immediate_action_taken TEXT,
  status TEXT DEFAULT 'reported',
  severity TEXT DEFAULT 'medium',
  is_confidential BOOLEAN DEFAULT true,
  assigned_to UUID,
  escalated_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.safeguarding_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view safeguarding incidents" ON public.safeguarding_incidents
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (
      public.user_has_permission(auth.uid(), organization_id, 'accountability', 'view', 'safeguarding')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Org members can report safeguarding incidents" ON public.safeguarding_incidents
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Authorized users can update safeguarding incidents" ON public.safeguarding_incidents
  FOR UPDATE TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (
      public.user_has_permission(auth.uid(), organization_id, 'accountability', 'manage', 'safeguarding')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ===== WHISTLEBLOWER REPORTS TABLE =====
CREATE TABLE public.whistleblower_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_description TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  contact_info TEXT,
  status TEXT DEFAULT 'received',
  assigned_to UUID,
  response_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whistleblower_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view whistleblower reports" ON public.whistleblower_reports
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (
      public.get_org_member_role(auth.uid(), organization_id) = 'admin'
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Only admin can update whistleblower reports" ON public.whistleblower_reports
  FOR UPDATE TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (
      public.get_org_member_role(auth.uid(), organization_id) = 'admin'
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Public can submit whistleblower reports" ON public.whistleblower_reports
  FOR INSERT TO anon
  WITH CHECK (true);

-- ===== DEDUP DECISIONS TABLE =====
CREATE TABLE public.dedup_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id_a UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  beneficiary_id_b UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  decided_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, beneficiary_id_a, beneficiary_id_b)
);

ALTER TABLE public.dedup_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage dedup decisions" ON public.dedup_decisions
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (
      public.get_org_member_role(auth.uid(), organization_id) = 'admin'
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ===== ORGANIZATION COMPLIANCE COLUMNS =====
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS kra_exemption_cert_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS kra_exemption_expiry DATE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS ngo_board_cert_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS ngo_board_cert_expiry DATE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS pbo_number TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS pbo_expiry DATE;

-- ===== STORAGE BUCKETS =====
INSERT INTO storage.buckets (id, name, public) VALUES ('policy-documents', 'policy-documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('compliance-docs', 'compliance-docs', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members can upload policy documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'policy-documents');

CREATE POLICY "Org members can view policy documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'policy-documents');

CREATE POLICY "Org members can upload compliance docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'compliance-docs');

CREATE POLICY "Org members can view compliance docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'compliance-docs');

-- ===== RBAC PERMISSIONS (with required columns) =====
INSERT INTO public.rbac_permissions (module, module_display_name, action, resource, display_name, description)
VALUES
  ('accountability', 'Accountability', 'view', 'accountability', 'View Accountability', 'View accountability module'),
  ('accountability', 'Accountability', 'manage', 'complaints', 'Manage Complaints', 'Manage complaints and feedback'),
  ('accountability', 'Accountability', 'view', 'safeguarding', 'View Safeguarding', 'View safeguarding incidents'),
  ('accountability', 'Accountability', 'manage', 'safeguarding', 'Manage Safeguarding', 'Manage safeguarding incidents')
ON CONFLICT DO NOTHING;

-- Assign all accountability permissions to org_admin roles
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
CROSS JOIN public.rbac_permissions p
WHERE r.name = 'org_admin'
  AND p.module = 'accountability'
ON CONFLICT DO NOTHING;

-- Assign view + manage complaints to program_manager
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
CROSS JOIN public.rbac_permissions p
WHERE r.name = 'program_manager'
  AND p.module = 'accountability'
  AND (p.resource = 'accountability' OR (p.action = 'manage' AND p.resource = 'complaints'))
ON CONFLICT DO NOTHING;

-- Assign view accountability to me_officer
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
CROSS JOIN public.rbac_permissions p
WHERE r.name = 'me_officer'
  AND p.module = 'accountability'
  AND p.resource = 'accountability'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- ===== FIND POTENTIAL DUPLICATES FUNCTION =====
CREATE OR REPLACE FUNCTION public.find_potential_duplicates(_org_id UUID)
RETURNS TABLE (
  id_a UUID, name_a TEXT, dob_a DATE,
  id_b UUID, name_b TEXT, dob_b DATE,
  match_type TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    a.id AS id_a,
    COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '') AS name_a,
    a.date_of_birth::date AS dob_a,
    b.id AS id_b,
    COALESCE(b.first_name, '') || ' ' || COALESCE(b.last_name, '') AS name_b,
    b.date_of_birth::date AS dob_b,
    CASE
      WHEN LOWER(a.first_name) = LOWER(b.first_name)
       AND LOWER(a.last_name) = LOWER(b.last_name)
       AND a.date_of_birth = b.date_of_birth
      THEN 'exact_match'
      ELSE 'similar_name_dob'
    END AS match_type
  FROM public.beneficiaries a
  JOIN public.beneficiaries b ON a.id < b.id
    AND a.organization_id = b.organization_id
  WHERE a.organization_id = _org_id
    AND a.deleted_at IS NULL
    AND b.deleted_at IS NULL
    AND LOWER(a.first_name) = LOWER(b.first_name)
    AND LOWER(a.last_name) = LOWER(b.last_name)
    AND (
      a.date_of_birth = b.date_of_birth
      OR (a.date_of_birth IS NOT NULL AND b.date_of_birth IS NOT NULL
          AND ABS(EXTRACT(EPOCH FROM (a.date_of_birth::timestamp - b.date_of_birth::timestamp))) < 365.25 * 86400)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.dedup_decisions d
      WHERE d.organization_id = _org_id
        AND ((d.beneficiary_id_a = a.id AND d.beneficiary_id_b = b.id)
          OR (d.beneficiary_id_a = b.id AND d.beneficiary_id_b = a.id))
    )
  LIMIT 50;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_org ON public.complaints(organization_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_safeguarding_org ON public.safeguarding_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_whistleblower_org ON public.whistleblower_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_dedup_decisions_org ON public.dedup_decisions(organization_id);
