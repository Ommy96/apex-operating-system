
-- ============ HOME VISITS ============
CREATE TABLE IF NOT EXISTS public.home_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  visited_by UUID REFERENCES auth.users(id),
  living_conditions TEXT,
  household_income NUMERIC,
  health_status TEXT,
  risks_observed TEXT,
  risk_flags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  follow_up_needed BOOLEAN NOT NULL DEFAULT false,
  field_log_id UUID REFERENCES public.field_logs(id) ON DELETE SET NULL,
  synced_from_offline BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_home_visits_org ON public.home_visits(organization_id);
CREATE INDEX idx_home_visits_beneficiary ON public.home_visits(beneficiary_id);
CREATE INDEX idx_home_visits_date ON public.home_visits(visit_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_visits TO authenticated;
GRANT ALL ON public.home_visits TO service_role;

ALTER TABLE public.home_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_home_visits" ON public.home_visits FOR SELECT TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "org_members_insert_home_visits" ON public.home_visits FOR INSERT TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org_members_update_home_visits" ON public.home_visits FOR UPDATE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org_members_delete_home_visits" ON public.home_visits FOR DELETE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE TRIGGER trg_home_visits_updated_at BEFORE UPDATE ON public.home_visits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SCHOOL VISITS ============
CREATE TABLE IF NOT EXISTS public.school_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  visited_by UUID REFERENCES auth.users(id),
  institution_name TEXT,
  attendance_rate NUMERIC,
  academic_performance TEXT,
  academic_average NUMERIC,
  current_grade TEXT,
  teacher_feedback TEXT,
  behaviour_report TEXT,
  notes TEXT,
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  follow_up_needed BOOLEAN NOT NULL DEFAULT false,
  field_log_id UUID REFERENCES public.field_logs(id) ON DELETE SET NULL,
  synced_from_offline BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_school_visits_org ON public.school_visits(organization_id);
CREATE INDEX idx_school_visits_beneficiary ON public.school_visits(beneficiary_id);
CREATE INDEX idx_school_visits_date ON public.school_visits(visit_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_visits TO authenticated;
GRANT ALL ON public.school_visits TO service_role;

ALTER TABLE public.school_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_school_visits" ON public.school_visits FOR SELECT TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "org_members_insert_school_visits" ON public.school_visits FOR INSERT TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org_members_update_school_visits" ON public.school_visits FOR UPDATE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org_members_delete_school_visits" ON public.school_visits FOR DELETE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE TRIGGER trg_school_visits_updated_at BEFORE UPDATE ON public.school_visits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CONSENT DOCUMENTS ============
CREATE TABLE IF NOT EXISTS public.consent_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'consent_form',
  title TEXT,
  file_url TEXT,
  file_name TEXT,
  signed_by TEXT,
  signed_at DATE,
  expires_at DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT consent_scope_check CHECK (beneficiary_id IS NOT NULL OR household_id IS NOT NULL)
);
CREATE INDEX idx_consent_docs_org ON public.consent_documents(organization_id);
CREATE INDEX idx_consent_docs_beneficiary ON public.consent_documents(beneficiary_id);
CREATE INDEX idx_consent_docs_household ON public.consent_documents(household_id);
CREATE INDEX idx_consent_docs_expires ON public.consent_documents(expires_at);
CREATE INDEX idx_consent_docs_status ON public.consent_documents(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_documents TO authenticated;
GRANT ALL ON public.consent_documents TO service_role;

ALTER TABLE public.consent_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_consent_docs" ON public.consent_documents FOR SELECT TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "org_members_insert_consent_docs" ON public.consent_documents FOR INSERT TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org_members_update_consent_docs" ON public.consent_documents FOR UPDATE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org_members_delete_consent_docs" ON public.consent_documents FOR DELETE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE TRIGGER trg_consent_docs_updated_at BEFORE UPDATE ON public.consent_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: has valid consent for a beneficiary (photo release)
CREATE OR REPLACE FUNCTION public.has_valid_photo_consent(_beneficiary_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consent_documents
    WHERE beneficiary_id = _beneficiary_id
      AND doc_type IN ('photo_release', 'consent_form')
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
      AND deleted_at IS NULL
  );
$$;

-- ============ VISIT REQUESTS ============
CREATE TABLE IF NOT EXISTS public.visit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  donor_account_id UUID REFERENCES public.donor_accounts(id) ON DELETE SET NULL,
  requested_by_user UUID REFERENCES auth.users(id),
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  requested_date DATE,
  purpose TEXT,
  donor_message TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  scheduled_date TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  staff_notes TEXT,
  decline_reason TEXT,
  completed_at TIMESTAMPTZ,
  visit_feedback TEXT,
  home_visit_id UUID REFERENCES public.home_visits(id) ON DELETE SET NULL,
  status_history JSONB DEFAULT '[]'::jsonb,
  deleted_at TIMESTAMPTZ,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visit_requests_org ON public.visit_requests(organization_id);
CREATE INDEX idx_visit_requests_donor ON public.visit_requests(donor_account_id);
CREATE INDEX idx_visit_requests_status ON public.visit_requests(status);
CREATE INDEX idx_visit_requests_beneficiary ON public.visit_requests(beneficiary_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_requests TO authenticated;
GRANT ALL ON public.visit_requests TO service_role;

ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_visit_requests" ON public.visit_requests FOR SELECT TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.donor_accounts da
    WHERE da.id = visit_requests.donor_account_id
      AND da.user_id = auth.uid()
  )
);
CREATE POLICY "org_members_insert_visit_requests" ON public.visit_requests FOR INSERT TO authenticated
WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id)
  OR EXISTS (
    SELECT 1 FROM public.donor_accounts da
    WHERE da.id = visit_requests.donor_account_id
      AND da.user_id = auth.uid()
      AND da.organization_id = visit_requests.organization_id
  )
);
CREATE POLICY "org_staff_update_visit_requests" ON public.visit_requests FOR UPDATE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org_staff_delete_visit_requests" ON public.visit_requests FOR DELETE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE TRIGGER trg_visit_requests_updated_at BEFORE UPDATE ON public.visit_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO DATA QUALITY FLAG FOR EXPIRED CONSENT ============
CREATE OR REPLACE FUNCTION public.flag_expired_consent()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;

  IF NEW.status = 'expired' AND NEW.beneficiary_id IS NOT NULL THEN
    INSERT INTO public.data_quality_flags (
      organization_id, entity_type, entity_id, flag_type, severity, description, status
    ) VALUES (
      NEW.organization_id, 'beneficiary', NEW.beneficiary_id, 'expired_consent', 'high',
      'Consent document (' || NEW.doc_type || ') has expired', 'open'
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_flag_expired_consent
BEFORE INSERT OR UPDATE ON public.consent_documents
FOR EACH ROW EXECUTE FUNCTION public.flag_expired_consent();

NOTIFY pgrst, 'reload schema';
