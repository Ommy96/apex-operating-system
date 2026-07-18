
-- 1. Add beneficiary_code column (mirrors/replaces unique_id going forward)
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS beneficiary_code TEXT;

-- 2. Org-level format config
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS beneficiary_code_prefix TEXT,
  ADD COLUMN IF NOT EXISTS beneficiary_code_format TEXT NOT NULL DEFAULT '{prefix}-{yy}-{seq}',
  ADD COLUMN IF NOT EXISTS beneficiary_code_seq INT NOT NULL DEFAULT 0;

-- 3. Helper: derive org initials fallback prefix (up to 4 A-Z chars)
CREATE OR REPLACE FUNCTION public._org_initials(_org_id uuid)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    NULLIF(regexp_replace(UPPER(o.beneficiary_code_prefix), '[^A-Z0-9]', '', 'g'), ''),
    NULLIF(regexp_replace(UPPER(string_agg(LEFT(w, 1), '')), '[^A-Z0-9]', '', 'g'), ''),
    UPPER(LEFT(regexp_replace(o.name, '[^A-Za-z0-9]', '', 'g'), 4)),
    'ORG'
  )
  FROM public.organizations o
  LEFT JOIN LATERAL regexp_split_to_table(o.name, '\s+') w ON true
  WHERE o.id = _org_id
  GROUP BY o.id, o.name, o.beneficiary_code_prefix;
$$;

-- 4. Atomic code generator: increments org's seq and returns formatted code
CREATE OR REPLACE FUNCTION public.next_beneficiary_code(_org_id uuid)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fmt TEXT;
  prefix TEXT;
  new_seq INT;
  yy TEXT;
  yyyy TEXT;
  result TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    -- Atomically bump seq
    UPDATE public.organizations
       SET beneficiary_code_seq = beneficiary_code_seq + 1
     WHERE id = _org_id
     RETURNING beneficiary_code_seq,
               COALESCE(NULLIF(beneficiary_code_format, ''), '{prefix}-{yy}-{seq}')
      INTO new_seq, fmt;

    IF new_seq IS NULL THEN
      RAISE EXCEPTION 'Organization % not found', _org_id;
    END IF;

    prefix := public._org_initials(_org_id);
    yy := to_char(CURRENT_DATE, 'YY');
    yyyy := to_char(CURRENT_DATE, 'YYYY');

    result := fmt;
    result := replace(result, '{prefix}', prefix);
    result := replace(result, '{yy}', yy);
    result := replace(result, '{yyyy}', yyyy);
    result := replace(result, '{seq}', lpad(new_seq::text, 3, '0'));

    -- Ensure uniqueness (in case of collisions with legacy data)
    IF NOT EXISTS (
      SELECT 1 FROM public.beneficiaries
       WHERE organization_id = _org_id AND beneficiary_code = result
    ) THEN
      RETURN result;
    END IF;

    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Could not allocate unique beneficiary_code after 50 attempts';
    END IF;
  END LOOP;
END;
$$;

-- 5. BEFORE INSERT trigger to auto-populate beneficiary_code (and mirror unique_id)
CREATE OR REPLACE FUNCTION public.trg_set_beneficiary_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.beneficiary_code IS NULL OR NEW.beneficiary_code = '' THEN
    NEW.beneficiary_code := public.next_beneficiary_code(NEW.organization_id);
  END IF;
  IF NEW.unique_id IS NULL OR NEW.unique_id = '' THEN
    NEW.unique_id := NEW.beneficiary_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_beneficiary_code ON public.beneficiaries;
CREATE TRIGGER set_beneficiary_code
BEFORE INSERT ON public.beneficiaries
FOR EACH ROW EXECUTE FUNCTION public.trg_set_beneficiary_code();

-- 6. Backfill: copy existing valid unique_id, then generate for the rest
UPDATE public.beneficiaries
   SET beneficiary_code = unique_id
 WHERE beneficiary_code IS NULL
   AND unique_id IS NOT NULL
   AND unique_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-'; -- skip UUID-shaped values

-- Generate codes for remaining beneficiaries in chronological order
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
BEGIN
  FOR r IN
    SELECT id, organization_id
      FROM public.beneficiaries
     WHERE beneficiary_code IS NULL
     ORDER BY organization_id, created_at
  LOOP
    new_code := public.next_beneficiary_code(r.organization_id);
    UPDATE public.beneficiaries
       SET beneficiary_code = new_code,
           unique_id = COALESCE(NULLIF(unique_id, ''), new_code)
     WHERE id = r.id;
  END LOOP;
END $$;

-- 7. Ensure org seq is at least the highest existing sequence number so future codes don't collide
UPDATE public.organizations o
   SET beneficiary_code_seq = GREATEST(o.beneficiary_code_seq, sub.max_seq)
  FROM (
    SELECT organization_id,
           COALESCE(MAX(NULLIF(regexp_replace(beneficiary_code, '.*[^0-9]([0-9]+)$', '\1'), '')::int), 0) AS max_seq
      FROM public.beneficiaries
     WHERE beneficiary_code ~ '[0-9]+$'
     GROUP BY organization_id
  ) sub
 WHERE sub.organization_id = o.id;

-- 8. Unique constraint per org
CREATE UNIQUE INDEX IF NOT EXISTS beneficiaries_org_code_unique
  ON public.beneficiaries (organization_id, beneficiary_code)
  WHERE beneficiary_code IS NOT NULL;

-- 9. Audit backfill
INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, metadata)
VALUES ('beneficiary_code_backfill', 'beneficiaries', gen_random_uuid(), NULL,
        jsonb_build_object('note', 'Backfilled beneficiary_code across all orgs', 'at', now()));

NOTIFY pgrst, 'reload schema';
