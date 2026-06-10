-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.care_arrangement_type AS ENUM (
    'unknown',
    'independent',
    'under_guardian_care',
    'head_of_household_with_dependents',
    'institutional_care'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Columns
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS care_arrangement public.care_arrangement_type NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS care_arrangement_set_by UUID NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS care_arrangement_set_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS institution_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS institution_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS institution_contact_person TEXT NULL,
  ADD COLUMN IF NOT EXISTS institution_contact_phone TEXT NULL,
  ADD COLUMN IF NOT EXISTS institution_placement_date DATE NULL,
  ADD COLUMN IF NOT EXISTS case_worker_name TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_beneficiaries_org_care_arrangement
  ON public.beneficiaries (organization_id, care_arrangement);

-- 3. Backfill in a single transaction
DO $$
DECLARE
  r RECORD;
  computed public.care_arrangement_type;
  guardian_count INT;
  age_years INT;
BEGIN
  FOR r IN SELECT id, organization_id, family_status, date_of_birth FROM public.beneficiaries WHERE care_arrangement = 'unknown' LOOP
    computed := NULL;

    IF r.family_status = 'Independent adult' THEN
      computed := 'independent';
    ELSIF r.family_status = 'Child-headed household' THEN
      computed := 'head_of_household_with_dependents';
    ELSE
      SELECT COUNT(*) INTO guardian_count FROM public.beneficiary_guardians WHERE beneficiary_id = r.id;
      IF guardian_count > 0 THEN
        computed := 'under_guardian_care';
      ELSIF r.date_of_birth IS NOT NULL THEN
        age_years := date_part('year', age(r.date_of_birth))::int;
        IF age_years < 18 THEN
          computed := 'under_guardian_care';
        ELSIF age_years >= 25 THEN
          computed := 'independent';
        ELSE
          computed := 'unknown';
        END IF;
      ELSE
        computed := 'unknown';
      END IF;
    END IF;

    IF computed IS NOT NULL AND computed <> 'unknown' THEN
      UPDATE public.beneficiaries SET care_arrangement = computed WHERE id = r.id;

      INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, new_values, metadata)
      VALUES (
        'backfill_care_arrangement',
        'beneficiary',
        r.id,
        NULL,
        jsonb_build_object('care_arrangement', computed),
        jsonb_build_object('organization_id', r.organization_id, 'source', 'migration_backfill')
      );
    END IF;
  END LOOP;
END $$;