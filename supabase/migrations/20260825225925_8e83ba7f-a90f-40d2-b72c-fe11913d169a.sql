-- ============================================================
-- Personal story fields + hobby/interest catalogue + share links
-- ============================================================

-- 1. Personal story fields on beneficiaries
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS hobbies_list TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS career_ambition TEXT,
  ADD COLUMN IF NOT EXISTS favourite_subject TEXT,
  ADD COLUMN IF NOT EXISTS personal_strengths TEXT,
  ADD COLUMN IF NOT EXISTS bio_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bio_updated_by UUID;

-- Carry over legacy free-text hobbies into the array (comma separated), once.
UPDATE public.beneficiaries
SET hobbies_list = ARRAY(
      SELECT btrim(x) FROM unnest(string_to_array(hobbies, ',')) AS x WHERE btrim(x) <> ''
    )
WHERE hobbies IS NOT NULL
  AND btrim(hobbies) <> ''
  AND (hobbies_list IS NULL OR cardinality(hobbies_list) = 0);

-- Carry over legacy ambition
UPDATE public.beneficiaries
SET career_ambition = future_ambition
WHERE career_ambition IS NULL AND future_ambition IS NOT NULL AND btrim(future_ambition) <> '';

-- 2. Per-org catalogue of hobbies / interests
CREATE TABLE IF NOT EXISTS public.interest_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'hobby' CHECK (kind IN ('hobby','interest')),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, kind, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interest_types TO authenticated;
GRANT ALL ON public.interest_types TO service_role;

ALTER TABLE public.interest_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interest_types_select" ON public.interest_types;
CREATE POLICY "interest_types_select" ON public.interest_types
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "interest_types_write" ON public.interest_types;
CREATE POLICY "interest_types_write" ON public.interest_types
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_interest_types_org ON public.interest_types(organization_id, kind, sort_order);

-- Seeder
CREATE OR REPLACE FUNCTION public.seed_default_interest_types(_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hobby_labels TEXT[] := ARRAY['Football','Netball','Athletics','Volleyball','Swimming','Reading','Drawing','Painting','Singing','Dancing','Drama','Music','Chess','Farming','Cooking','Cycling','Church choir','Scouting','Debate','Storytelling'];
  interest_labels TEXT[] := ARRAY['Coding','Science','Mathematics','Business','Health & medicine','Environment','Community service','Journalism','Photography','Fashion & design','Agriculture','Engineering','Teaching','Sports coaching','Entrepreneurship'];
  l TEXT;
  i INTEGER := 0;
BEGIN
  FOREACH l IN ARRAY hobby_labels LOOP
    i := i + 1;
    INSERT INTO public.interest_types (organization_id, kind, key, label, sort_order)
    VALUES (_org_id, 'hobby', lower(regexp_replace(l, '[^a-zA-Z0-9]+', '_', 'g')), l, i)
    ON CONFLICT (organization_id, kind, key) DO NOTHING;
  END LOOP;
  i := 0;
  FOREACH l IN ARRAY interest_labels LOOP
    i := i + 1;
    INSERT INTO public.interest_types (organization_id, kind, key, label, sort_order)
    VALUES (_org_id, 'interest', lower(regexp_replace(l, '[^a-zA-Z0-9]+', '_', 'g')), l, i)
    ON CONFLICT (organization_id, kind, key) DO NOTHING;
  END LOOP;
END;
$$;

-- Seed every existing organisation
DO $$
DECLARE o RECORD;
BEGIN
  FOR o IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_interest_types(o.id);
  END LOOP;
END $$;

-- Seed new organisations automatically
CREATE OR REPLACE FUNCTION public.tg_seed_interest_types()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_interest_types(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_interest_types ON public.organizations;
CREATE TRIGGER trg_seed_interest_types
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.tg_seed_interest_types();

-- 3. Bio stamp trigger
CREATE OR REPLACE FUNCTION public.tg_stamp_bio_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.bio IS DISTINCT FROM OLD.bio THEN
    NEW.bio_updated_at := now();
    NEW.bio_updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_bio_update ON public.beneficiaries;
CREATE TRIGGER trg_stamp_bio_update
BEFORE UPDATE ON public.beneficiaries
FOR EACH ROW EXECUTE FUNCTION public.tg_stamp_bio_update();

-- 4. Time-limited share links
CREATE TABLE IF NOT EXISTS public.beneficiary_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  share_mode TEXT NOT NULL CHECK (share_mode IN ('sponsor','public')),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiary_share_links TO authenticated;
GRANT ALL ON public.beneficiary_share_links TO service_role;

ALTER TABLE public.beneficiary_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_links_org" ON public.beneficiary_share_links;
CREATE POLICY "share_links_org" ON public.beneficiary_share_links
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_share_links_beneficiary ON public.beneficiary_share_links(beneficiary_id);

-- Access log for shared profiles
CREATE TABLE IF NOT EXISTS public.beneficiary_share_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id UUID NOT NULL REFERENCES public.beneficiary_share_links(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.beneficiary_share_access_log TO authenticated;
GRANT ALL ON public.beneficiary_share_access_log TO service_role;

ALTER TABLE public.beneficiary_share_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_access_log_read" ON public.beneficiary_share_access_log;
CREATE POLICY "share_access_log_read" ON public.beneficiary_share_access_log
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

-- 5. Anonymous resolver for a share token. Applies safeguarding redaction server-side.
CREATE OR REPLACE FUNCTION public.get_shared_beneficiary_profile(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lnk RECORD;
  b RECORD;
  org RECORD;
  has_photo_consent BOOLEAN := false;
  result JSONB;
  photo TEXT;
  nm TEXT;
BEGIN
  SELECT * INTO lnk FROM public.beneficiary_share_links WHERE token = _token;
  IF lnk IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  IF lnk.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'revoked');
  END IF;
  IF lnk.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  SELECT * INTO b FROM public.beneficiaries WHERE id = lnk.beneficiary_id AND deleted_at IS NULL;
  IF b IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT id, organization_name, logo_url, primary_color, email, phone
    INTO org FROM public.organizations WHERE id = lnk.organization_id;

  -- Photo release consent: an active photo-release consent document on file.
  SELECT EXISTS (
    SELECT 1 FROM public.consent_documents cd
    WHERE cd.beneficiary_id = b.id
      AND cd.deleted_at IS NULL
      AND cd.doc_type IN ('photo_release','consent_form')
      AND (cd.expires_at IS NULL OR cd.expires_at >= current_date)
      AND coalesce(cd.status,'active') <> 'expired'
  ) INTO has_photo_consent;

  IF NOT has_photo_consent THEN
    has_photo_consent := coalesce(b.consent_given, false);
  END IF;

  photo := CASE WHEN has_photo_consent THEN b.photo_url ELSE NULL END;

  nm := CASE
    WHEN lnk.share_mode = 'sponsor' THEN coalesce(b.first_name, split_part(coalesce(b.display_name,''), ' ', 1))
    ELSE coalesce(b.first_name, split_part(coalesce(b.display_name,''), ' ', 1))
  END;

  -- Log access
  UPDATE public.beneficiary_share_links
     SET access_count = access_count + 1, last_accessed_at = now()
   WHERE id = lnk.id;
  INSERT INTO public.beneficiary_share_access_log (share_link_id, organization_id)
  VALUES (lnk.id, lnk.organization_id);

  result := jsonb_build_object(
    'share_mode', lnk.share_mode,
    'expires_at', lnk.expires_at,
    'photo_consent', has_photo_consent,
    'organization', jsonb_build_object(
      'name', org.organization_name,
      'logo_url', org.logo_url,
      'primary_color', org.primary_color,
      'contact', coalesce(org.email, org.phone)
    ),
    'beneficiary', jsonb_build_object(
      'name', nm,
      'code', b.beneficiary_code,
      'photo_url', photo,
      'age', CASE WHEN b.date_of_birth IS NOT NULL
                  THEN date_part('year', age(b.date_of_birth))::int ELSE NULL END,
      'county', b.county,
      'gender', b.gender,
      'bio', b.bio,
      'hobbies', to_jsonb(coalesce(b.hobbies_list, '{}')),
      'interests', to_jsonb(coalesce(b.interests, '{}')),
      'career_ambition', b.career_ambition,
      'favourite_subject', b.favourite_subject,
      'personal_strengths', b.personal_strengths,
      'academic_level', b.academic_level,
      'grade', b.grade,
      'institution_name', CASE WHEN lnk.share_mode = 'sponsor' THEN b.institution_name ELSE NULL END
    ),
    'needs', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'label', nt.label, 'status', bn.status,
        'estimated_cost', bn.estimated_cost, 'currency', bn.currency,
        'funded_amount', bn.funded_amount))
      FROM public.beneficiary_needs bn
      JOIN public.need_types nt ON nt.id = bn.need_type_id
      WHERE bn.beneficiary_id = b.id
    ), '[]'::jsonb),
    'milestones', coalesce((
      SELECT jsonb_agg(jsonb_build_object('title', le.title, 'occurred_on', le.occurred_on))
      FROM public.life_events le
      WHERE le.beneficiary_id = b.id
        AND le.deleted_at IS NULL
        AND le.is_sensitive = false
        AND le.severity IN ('low','moderate')
    ), '[]'::jsonb)
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_beneficiary_profile(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_beneficiary_profile(TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';