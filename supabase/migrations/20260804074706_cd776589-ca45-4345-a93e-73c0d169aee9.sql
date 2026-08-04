
-- slugify helper
CREATE OR REPLACE FUNCTION public.slugify(_txt text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(
    NULLIF(trim(both '-' from regexp_replace(lower(COALESCE(_txt, '')), '[^a-z0-9]+', '-', 'g')), ''),
    'item'
  )
$$;

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS previous_slugs text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS previous_slugs text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS previous_slugs text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS household_code text;

-- unique slug generator scoped per org
CREATE OR REPLACE FUNCTION public.next_unique_slug(_table text, _org_id uuid, _base text, _exclude_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  candidate text := _base;
  n int := 1;
  taken boolean;
BEGIN
  LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM public.%I WHERE organization_id = $1 AND (slug = $2 OR $2 = ANY(previous_slugs)) AND ($3 IS NULL OR id <> $3))',
      _table
    ) INTO taken USING _org_id, candidate, _exclude_id;
    EXIT WHEN NOT taken;
    n := n + 1;
    candidate := _base || '-' || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

-- shared trigger for slugged tables
CREATE OR REPLACE FUNCTION public.tg_maintain_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base text;
BEGIN
  IF NEW.name IS NULL THEN RETURN NEW; END IF;
  base := public.slugify(NEW.name);

  IF TG_OP = 'INSERT' THEN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.next_unique_slug(TG_TABLE_NAME, NEW.organization_id, base, NULL);
    END IF;
  ELSE
    IF (NEW.slug IS NULL OR NEW.slug = '') OR (NEW.name IS DISTINCT FROM OLD.name AND NEW.slug IS NOT DISTINCT FROM OLD.slug) THEN
      NEW.slug := public.next_unique_slug(TG_TABLE_NAME, NEW.organization_id, base, NEW.id);
    END IF;
    IF OLD.slug IS NOT NULL AND NEW.slug IS DISTINCT FROM OLD.slug AND NOT (OLD.slug = ANY(NEW.previous_slugs)) THEN
      NEW.previous_slugs := array_append(NEW.previous_slugs, OLD.slug);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_slug_programs ON public.programs;
CREATE TRIGGER trg_slug_programs BEFORE INSERT OR UPDATE ON public.programs
FOR EACH ROW EXECUTE FUNCTION public.tg_maintain_slug();

DROP TRIGGER IF EXISTS trg_slug_projects ON public.projects;
CREATE TRIGGER trg_slug_projects BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.tg_maintain_slug();

DROP TRIGGER IF EXISTS trg_slug_activities ON public.activities;
CREATE TRIGGER trg_slug_activities BEFORE INSERT OR UPDATE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.tg_maintain_slug();

-- backfill slugs
DO $$
DECLARE r record; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['programs','projects','activities'] LOOP
    FOR r IN EXECUTE format('SELECT id, organization_id, name FROM public.%I WHERE slug IS NULL OR slug = '''' ORDER BY created_at NULLS LAST', t) LOOP
      EXECUTE format('UPDATE public.%I SET slug = $1 WHERE id = $2', t)
      USING public.next_unique_slug(t, r.organization_id, public.slugify(r.name), r.id), r.id;
    END LOOP;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS programs_org_slug_key ON public.programs(organization_id, slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS projects_org_slug_key ON public.projects(organization_id, slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS activities_org_slug_key ON public.activities(organization_id, slug) WHERE slug IS NOT NULL;

-- household codes
CREATE OR REPLACE FUNCTION public.next_household_code(_org_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yy text := to_char(now(), 'YY');
  n int;
  candidate text;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(household_code, '^HH-\d{2}-', ''), '')::int), 0)
    INTO n
  FROM public.households
  WHERE organization_id = _org_id AND household_code ~ ('^HH-' || yy || '-\d+$');
  LOOP
    n := n + 1;
    candidate := 'HH-' || yy || '-' || lpad(n::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.households WHERE organization_id = _org_id AND household_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_set_household_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.household_code IS NULL OR NEW.household_code = '' THEN
    NEW.household_code := public.next_household_code(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_household_code ON public.households;
CREATE TRIGGER trg_household_code BEFORE INSERT ON public.households
FOR EACH ROW EXECUTE FUNCTION public.tg_set_household_code();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, organization_id FROM public.households WHERE household_code IS NULL ORDER BY created_at NULLS LAST LOOP
    UPDATE public.households SET household_code = public.next_household_code(r.organization_id) WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS households_org_code_key ON public.households(organization_id, household_code) WHERE household_code IS NOT NULL;

NOTIFY pgrst, 'reload schema';
