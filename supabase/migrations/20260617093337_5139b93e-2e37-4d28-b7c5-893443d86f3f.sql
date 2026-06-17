-- Enable required extensions for fuzzy + phonetic matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- =====================================================================
-- duplicate_candidates table
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.duplicate_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id_a UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  beneficiary_id_b UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  match_score INT NOT NULL,
  match_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  CONSTRAINT duplicate_candidates_canonical_order CHECK (beneficiary_id_a < beneficiary_id_b),
  CONSTRAINT duplicate_candidates_status_chk CHECK (status IN ('pending','merged','rejected','reviewed_distinct')),
  CONSTRAINT duplicate_candidates_unique_pair UNIQUE (beneficiary_id_a, beneficiary_id_b)
);

CREATE INDEX IF NOT EXISTS idx_dup_candidates_org_status ON public.duplicate_candidates(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_dup_candidates_score ON public.duplicate_candidates(match_score DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.duplicate_candidates TO authenticated;
GRANT ALL ON public.duplicate_candidates TO service_role;

ALTER TABLE public.duplicate_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read duplicate_candidates"
  ON public.duplicate_candidates FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members insert duplicate_candidates"
  ON public.duplicate_candidates FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members update duplicate_candidates"
  ON public.duplicate_candidates FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins delete duplicate_candidates"
  ON public.duplicate_candidates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigram indexes for fast similarity
CREATE INDEX IF NOT EXISTS idx_beneficiaries_first_trgm ON public.beneficiaries USING gin (first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_last_trgm  ON public.beneficiaries USING gin (last_name  gin_trgm_ops);

-- =====================================================================
-- fuzzy_match_beneficiaries: combined fuzzy + phonetic matcher
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fuzzy_match_beneficiaries(
  _org_id UUID,
  _first_name TEXT,
  _last_name TEXT,
  _dob DATE DEFAULT NULL,
  _sub_county TEXT DEFAULT NULL,
  _household_id UUID DEFAULT NULL,
  _exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  date_of_birth DATE,
  sub_county TEXT,
  household_id UUID,
  match_score INT,
  match_reasons JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _full TEXT := lower(trim(coalesce(_first_name,'') || ' ' || coalesce(_last_name,'')));
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      b.id, b.first_name, b.last_name, b.display_name,
      b.date_of_birth, b.sub_county, b.household_id,
      similarity(lower(coalesce(b.first_name,'') || ' ' || coalesce(b.last_name,'')), _full) AS name_sim,
      (CASE WHEN _first_name IS NOT NULL AND b.first_name IS NOT NULL
            AND (soundex(b.first_name) = soundex(_first_name)
              OR dmetaphone(b.first_name) = dmetaphone(_first_name))
            THEN true ELSE false END) AS phonetic_first,
      (CASE WHEN _last_name IS NOT NULL AND b.last_name IS NOT NULL
            AND (soundex(b.last_name) = soundex(_last_name)
              OR dmetaphone(b.last_name) = dmetaphone(_last_name))
            THEN true ELSE false END) AS phonetic_last,
      (CASE WHEN _dob IS NOT NULL AND b.date_of_birth IS NOT NULL
            AND abs(extract(epoch FROM (b.date_of_birth - _dob))/86400) <= 366
            THEN true ELSE false END) AS dob_close,
      (CASE WHEN _dob IS NOT NULL AND b.date_of_birth = _dob THEN true ELSE false END) AS dob_exact,
      (CASE WHEN _sub_county IS NOT NULL AND b.sub_county IS NOT NULL
            AND lower(b.sub_county) = lower(_sub_county) THEN true ELSE false END) AS sub_county_match,
      (CASE WHEN _household_id IS NOT NULL AND b.household_id = _household_id
            THEN true ELSE false END) AS household_match
    FROM public.beneficiaries b
    WHERE b.organization_id = _org_id
      AND b.deleted_at IS NULL
      AND (_exclude_id IS NULL OR b.id <> _exclude_id)
      AND (
        similarity(lower(coalesce(b.first_name,'') || ' ' || coalesce(b.last_name,'')), _full) > 0.25
        OR (b.first_name IS NOT NULL AND _first_name IS NOT NULL
            AND (soundex(b.first_name) = soundex(_first_name) OR dmetaphone(b.first_name) = dmetaphone(_first_name)))
        OR (b.last_name  IS NOT NULL AND _last_name  IS NOT NULL
            AND (soundex(b.last_name)  = soundex(_last_name)  OR dmetaphone(b.last_name)  = dmetaphone(_last_name)))
        OR (_household_id IS NOT NULL AND b.household_id = _household_id)
      )
  ), scored AS (
    SELECT
      base.*,
      LEAST(100, GREATEST(0,
        (base.name_sim * 50)::int
        + (CASE WHEN base.phonetic_first THEN 10 ELSE 0 END)
        + (CASE WHEN base.phonetic_last  THEN 15 ELSE 0 END)
        + (CASE WHEN base.dob_exact THEN 25 WHEN base.dob_close THEN 10 ELSE 0 END)
        + (CASE WHEN base.sub_county_match THEN 10 ELSE 0 END)
        + (CASE WHEN base.household_match THEN 20 ELSE 0 END)
      )) AS score
    FROM base
  )
  SELECT
    s.id, s.first_name, s.last_name, s.display_name,
    s.date_of_birth, s.sub_county, s.household_id,
    s.score AS match_score,
    jsonb_build_object(
      'name_similarity', round(s.name_sim::numeric, 2),
      'phonetic_first', s.phonetic_first,
      'phonetic_last',  s.phonetic_last,
      'dob_exact',      s.dob_exact,
      'dob_within_1y',  s.dob_close,
      'sub_county_match', s.sub_county_match,
      'household_match', s.household_match
    ) AS match_reasons
  FROM scored s
  WHERE s.score > 40
  ORDER BY s.score DESC
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fuzzy_match_beneficiaries(UUID, TEXT, TEXT, DATE, TEXT, UUID, UUID) TO authenticated, service_role;

-- =====================================================================
-- merge_beneficiaries: re-point all related rows, soft-delete duplicate, audit
-- Canonical = older (smaller created_at). Duplicate id is soft-deleted.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.merge_beneficiaries(
  _candidate_id UUID,
  _canonical_id UUID,
  _duplicate_id UUID,
  _note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org UUID;
  _user UUID := auth.uid();
  _tbl TEXT;
  _related_tables TEXT[] := ARRAY[
    'activity_disbursements','activity_participants','allocations',
    'beneficiary_academics','beneficiary_baselines','beneficiary_cases',
    'beneficiary_donors','beneficiary_eligibility_scores','beneficiary_field_values',
    'beneficiary_guardians','beneficiary_out_of_system_contacts','beneficiary_progress_logs',
    'beneficiary_progression_history','beneficiary_risk_scores','beneficiary_services',
    'beneficiary_siblings','beneficiary_uploads','beneficiary_visitations',
    'case_entries','cash_transfers','complaints','consent_records',
    'data_access_requests','field_check_ins','field_logs',
    'financial_transactions','impact_stories','program_observations','program_visits',
    'sponsorship_updates','survey_responses'
  ];
  _moved_counts JSONB := '{}'::jsonb;
  _n INT;
BEGIN
  IF _canonical_id = _duplicate_id THEN
    RAISE EXCEPTION 'Canonical and duplicate must differ';
  END IF;

  SELECT organization_id INTO _org FROM public.beneficiaries WHERE id = _canonical_id;
  IF _org IS NULL THEN
    RAISE EXCEPTION 'Canonical beneficiary not found';
  END IF;

  -- Authorization
  IF NOT (public.user_belongs_to_org(_user, _org) OR public.has_role(_user, 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Re-point related rows
  FOREACH _tbl IN ARRAY _related_tables LOOP
    EXECUTE format('UPDATE public.%I SET beneficiary_id = $1 WHERE beneficiary_id = $2', _tbl)
      USING _canonical_id, _duplicate_id;
    GET DIAGNOSTICS _n = ROW_COUNT;
    IF _n > 0 THEN
      _moved_counts := _moved_counts || jsonb_build_object(_tbl, _n);
    END IF;
  END LOOP;

  -- Soft delete the duplicate
  UPDATE public.beneficiaries
     SET deleted_at = now(),
         updated_at = now()
   WHERE id = _duplicate_id;

  -- Mark candidate row
  IF _candidate_id IS NOT NULL THEN
    UPDATE public.duplicate_candidates
       SET status = 'merged',
           resolved_by = _user,
           resolved_at = now(),
           resolution_note = _note
     WHERE id = _candidate_id;
  END IF;

  -- Audit
  INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, new_values, metadata)
  VALUES (
    'beneficiary_merge',
    'beneficiary',
    _canonical_id,
    _user,
    jsonb_build_object('canonical_id', _canonical_id, 'duplicate_id', _duplicate_id, 'note', _note),
    jsonb_build_object('moved_rows', _moved_counts, 'candidate_id', _candidate_id, 'organization_id', _org)
  );

  RETURN jsonb_build_object(
    'success', true,
    'canonical_id', _canonical_id,
    'duplicate_id', _duplicate_id,
    'moved_rows', _moved_counts
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_beneficiaries(UUID, UUID, UUID, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';