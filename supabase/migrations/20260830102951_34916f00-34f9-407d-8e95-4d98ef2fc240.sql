ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS person_category text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS number_of_children integer,
  ADD COLUMN IF NOT EXISTS employment_status text;

ALTER TABLE public.guardians
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS sub_county text,
  ADD COLUMN IF NOT EXISTS estate_village text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beneficiaries_person_category_check'
  ) THEN
    ALTER TABLE public.beneficiaries
      ADD CONSTRAINT beneficiaries_person_category_check
      CHECK (person_category IS NULL OR person_category IN
        ('minor_student','adult_student','adult','group','household','organisation'));
  END IF;
END $$;

-- Backfill: infer category from existing data, never overwrite an explicit value
UPDATE public.beneficiaries b
SET person_category = CASE
  WHEN b.beneficiary_category = 'group' OR b.beneficiary_type::text = 'group' THEN 'group'
  WHEN b.beneficiary_category = 'organisation' THEN 'organisation'
  WHEN b.beneficiary_category = 'household' THEN 'household'
  WHEN b.date_of_birth IS NOT NULL
       AND (b.date_of_birth > (CURRENT_DATE - INTERVAL '18 years'))
       AND (b.beneficiary_type::text = 'student' OR b.academic_level IS NOT NULL)
    THEN 'minor_student'
  WHEN (b.beneficiary_type::text = 'student' OR b.academic_level IS NOT NULL)
    THEN 'adult_student'
  WHEN b.date_of_birth IS NOT NULL
       AND (b.date_of_birth > (CURRENT_DATE - INTERVAL '18 years'))
    THEN 'minor_student'
  ELSE 'adult'
END
WHERE b.person_category IS NULL;

CREATE INDEX IF NOT EXISTS idx_beneficiaries_person_category
  ON public.beneficiaries (organization_id, person_category);

NOTIFY pgrst, 'reload schema';