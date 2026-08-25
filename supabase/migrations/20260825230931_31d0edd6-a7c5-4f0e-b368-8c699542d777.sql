
-- 1. Dated FX rates -------------------------------------------------
ALTER TABLE public.currency_rates
  ADD COLUMN IF NOT EXISTS rate_date date NOT NULL DEFAULT CURRENT_DATE;
CREATE UNIQUE INDEX IF NOT EXISTS currency_rates_unique_day
  ON public.currency_rates (base_currency, target_currency, rate_date);

INSERT INTO public.currency_rates (base_currency, target_currency, rate, rate_date)
VALUES
  ('KES','USD',0.0077,CURRENT_DATE),('USD','KES',129.0,CURRENT_DATE),
  ('KES','EUR',0.0071,CURRENT_DATE),('EUR','KES',140.0,CURRENT_DATE),
  ('KES','GBP',0.0061,CURRENT_DATE),('GBP','KES',164.0,CURRENT_DATE),
  ('USD','EUR',0.92,CURRENT_DATE),('EUR','USD',1.09,CURRENT_DATE),
  ('USD','GBP',0.79,CURRENT_DATE),('GBP','USD',1.27,CURRENT_DATE)
ON CONFLICT (base_currency, target_currency, rate_date) DO NOTHING;

-- Rate as at a date (falls back to nearest earlier, then nearest later, then inverse)
CREATE OR REPLACE FUNCTION public.fx_rate_on(_from text, _to text, _on date)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN upper(_from) = upper(_to) THEN 1::numeric ELSE COALESCE(
    (SELECT r.rate FROM public.currency_rates r
      WHERE upper(r.base_currency)=upper(_from) AND upper(r.target_currency)=upper(_to)
        AND r.rate_date <= COALESCE(_on, CURRENT_DATE)
      ORDER BY r.rate_date DESC LIMIT 1),
    (SELECT r.rate FROM public.currency_rates r
      WHERE upper(r.base_currency)=upper(_from) AND upper(r.target_currency)=upper(_to)
      ORDER BY r.rate_date ASC LIMIT 1),
    (SELECT 1/NULLIF(r.rate,0) FROM public.currency_rates r
      WHERE upper(r.base_currency)=upper(_to) AND upper(r.target_currency)=upper(_from)
        AND r.rate_date <= COALESCE(_on, CURRENT_DATE)
      ORDER BY r.rate_date DESC LIMIT 1)
  ) END;
$$;

-- 2. Document types: sensitivity -------------------------------------
ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_shareable boolean NOT NULL DEFAULT false;

UPDATE public.document_types
   SET is_sensitive = true, sponsor_shareable = false
 WHERE is_consent_type = true
    OR key ~* '(consent|medical|health|intake|assessment|national_id|birth_cert|safeguard|legal|case)';

UPDATE public.document_types
   SET sponsor_shareable = true
 WHERE is_sensitive = false
   AND key ~* '(report_card|school_report|academic|certificate|photo|letter|thank)';

-- 3. Beneficiary documents: share-with-sponsor flag -------------------
ALTER TABLE public.beneficiary_uploads
  ADD COLUMN IF NOT EXISTS share_with_sponsor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shared_by uuid,
  ADD COLUMN IF NOT EXISTS shared_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_sponsor_shareable_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sensitive boolean;
BEGIN
  IF COALESCE(NEW.share_with_sponsor,false) THEN
    SELECT dt.is_sensitive INTO _sensitive
      FROM public.document_types dt
     WHERE dt.organization_id = NEW.organization_id
       AND dt.key = NEW.document_type
     LIMIT 1;

    IF COALESCE(_sensitive,false)
       OR COALESCE(NEW.document_type,'') ~* '(consent|medical|health|intake|assessment|national_id|birth_cert|safeguard|legal|case)' THEN
      RAISE EXCEPTION 'This document type is sensitive and can never be shared with sponsors';
    END IF;

    IF NEW.shared_at IS NULL THEN
      NEW.shared_at := now();
      NEW.shared_by := auth.uid();
    END IF;
  ELSE
    NEW.shared_at := NULL;
    NEW.shared_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sponsor_shareable ON public.beneficiary_uploads;
CREATE TRIGGER trg_enforce_sponsor_shareable
BEFORE INSERT OR UPDATE ON public.beneficiary_uploads
FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_shareable_document();

-- Helper: is the current user a donor of this beneficiary?
CREATE OR REPLACE FUNCTION public.is_donor_of_beneficiary(_beneficiary_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.donor_accounts da
    JOIN public.beneficiary_donors bd
      ON bd.organization_id = da.organization_id AND bd.donor_name = da.donor_name
    WHERE da.user_id = auth.uid() AND da.is_active = true
      AND bd.beneficiary_id = _beneficiary_id
    UNION ALL
    SELECT 1 FROM public.donor_accounts da
    JOIN public.sponsor_relationships sr ON sr.donor_account_id = da.id
    WHERE da.user_id = auth.uid() AND da.is_active = true
      AND sr.beneficiary_id = _beneficiary_id
  );
$$;

DROP POLICY IF EXISTS "Donors view shared beneficiary documents" ON public.beneficiary_uploads;
CREATE POLICY "Donors view shared beneficiary documents"
ON public.beneficiary_uploads FOR SELECT TO authenticated
USING (share_with_sponsor = true AND public.is_donor_of_beneficiary(beneficiary_id));

-- 4. Donors see enrollments of their beneficiaries --------------------
DROP POLICY IF EXISTS "Donors view enrollments of sponsored beneficiaries" ON public.beneficiary_services;
CREATE POLICY "Donors view enrollments of sponsored beneficiaries"
ON public.beneficiary_services FOR SELECT TO authenticated
USING (public.is_donor_of_beneficiary(beneficiary_id));

DROP POLICY IF EXISTS "Donors view programs in their org" ON public.programs;
CREATE POLICY "Donors view programs in their org"
ON public.programs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.donor_accounts da
  WHERE da.user_id = auth.uid() AND da.is_active = true
    AND da.organization_id = programs.organization_id
));

DROP POLICY IF EXISTS "Donors view projects in their org" ON public.projects;
CREATE POLICY "Donors view projects in their org"
ON public.projects FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.donor_accounts da
  WHERE da.user_id = auth.uid() AND da.is_active = true
    AND da.organization_id = projects.organization_id
));

DROP POLICY IF EXISTS "Donors read own sponsor relationships" ON public.sponsor_relationships;
CREATE POLICY "Donors read own sponsor relationships"
ON public.sponsor_relationships FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.donor_accounts da
  WHERE da.user_id = auth.uid() AND da.is_active = true
    AND (da.id = sponsor_relationships.donor_account_id
      OR (da.organization_id = sponsor_relationships.organization_id AND da.donor_name = sponsor_relationships.donor_name))
));

-- 5. Impact stories: authoring + approval workflow --------------------
ALTER TABLE public.impact_stories
  ADD COLUMN IF NOT EXISTS program_id uuid,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS consent_checked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_assisted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Block publishing without a consent check
CREATE OR REPLACE FUNCTION public.enforce_story_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'published' THEN
    IF NEW.beneficiary_id IS NOT NULL AND NOT COALESCE(NEW.consent_checked,false) THEN
      RAISE EXCEPTION 'A consent check is required before publishing a story about a beneficiary';
    END IF;
    IF NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'A story must be approved before it can be published';
    END IF;
    IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_story_consent ON public.impact_stories;
CREATE TRIGGER trg_enforce_story_consent
BEFORE INSERT OR UPDATE ON public.impact_stories
FOR EACH ROW EXECUTE FUNCTION public.enforce_story_consent();

DROP POLICY IF EXISTS "Donors read impact stories for sponsored beneficiaries" ON public.impact_stories;
CREATE POLICY "Donors read connected impact stories"
ON public.impact_stories FOR SELECT TO authenticated
USING (
  status = 'published' AND deleted_at IS NULL AND (
    (beneficiary_id IS NOT NULL AND public.is_donor_of_beneficiary(beneficiary_id))
    OR (program_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.donor_accounts da
      JOIN public.beneficiary_donors bd
        ON bd.organization_id = da.organization_id AND bd.donor_name = da.donor_name
      WHERE da.user_id = auth.uid() AND da.is_active = true
        AND da.organization_id = impact_stories.org_id
        AND bd.program_id = impact_stories.program_id
    ))
  )
);

-- 6. Sponsor correspondence ------------------------------------------
CREATE TABLE IF NOT EXISTS public.sponsor_correspondence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  donor_account_id uuid NOT NULL REFERENCES public.donor_accounts(id) ON DELETE CASCADE,
  beneficiary_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'message',
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_correspondence TO authenticated;
GRANT ALL ON public.sponsor_correspondence TO service_role;
ALTER TABLE public.sponsor_correspondence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage correspondence in their org"
ON public.sponsor_correspondence FOR ALL TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id))
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Donors read own correspondence"
ON public.sponsor_correspondence FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.donor_accounts da
  WHERE da.id = sponsor_correspondence.donor_account_id
    AND da.user_id = auth.uid() AND da.is_active = true
));

CREATE POLICY "Donors write own correspondence"
ON public.sponsor_correspondence FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.donor_accounts da
  WHERE da.id = sponsor_correspondence.donor_account_id
    AND da.user_id = auth.uid() AND da.is_active = true
    AND da.organization_id = sponsor_correspondence.organization_id
) AND public.is_donor_of_beneficiary(beneficiary_id));

CREATE TRIGGER update_sponsor_correspondence_updated_at
BEFORE UPDATE ON public.sponsor_correspondence
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sponsor_corr_donor ON public.sponsor_correspondence(donor_account_id, created_at DESC);

-- 7. Org toggle for donor birthday reminders --------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS donor_birthday_alerts_enabled boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
