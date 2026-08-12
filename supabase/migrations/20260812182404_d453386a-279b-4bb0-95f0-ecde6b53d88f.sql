-- ============ LIFE EVENT TYPES ============
CREATE TABLE IF NOT EXISTS public.life_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  description text,
  default_severity text NOT NULL DEFAULT 'moderate' CHECK (default_severity IN ('low','moderate','high','critical')),
  is_sensitive_default boolean NOT NULL DEFAULT false,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_event_types TO authenticated;
GRANT ALL ON public.life_event_types TO service_role;
ALTER TABLE public.life_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members select life_event_types" ON public.life_event_types FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members insert life_event_types" ON public.life_event_types FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members update life_event_types" ON public.life_event_types FOR UPDATE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members delete life_event_types" ON public.life_event_types FOR DELETE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE TRIGGER trg_life_event_types_touch BEFORE UPDATE ON public.life_event_types
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- ============ DOCUMENT TYPES ============
CREATE TABLE IF NOT EXISTS public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  description text,
  is_consent_type boolean NOT NULL DEFAULT false,
  requires_expiry boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_types TO authenticated;
GRANT ALL ON public.document_types TO service_role;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members select document_types" ON public.document_types FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members insert document_types" ON public.document_types FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members update document_types" ON public.document_types FOR UPDATE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "org members delete document_types" ON public.document_types FOR DELETE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE TRIGGER trg_document_types_touch BEFORE UPDATE ON public.document_types
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- ============ SENSITIVE-ACCESS HELPER ============
CREATE OR REPLACE FUNCTION public.can_view_sensitive_life_events(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = _org_id
          AND lower(om.role) IN ('owner','admin','org_admin','manager','safeguarding_officer','program_manager')
      );
$$;

-- ============ LIFE EVENTS ============
CREATE TABLE IF NOT EXISTS public.life_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_id uuid NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  life_event_type_id uuid REFERENCES public.life_event_types(id) ON DELETE SET NULL,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid,
  severity text NOT NULL DEFAULT 'moderate' CHECK (severity IN ('low','moderate','high','critical')),
  title text NOT NULL,
  description text,
  requires_follow_up boolean NOT NULL DEFAULT false,
  follow_up_due date,
  follow_up_status text CHECK (follow_up_status IN ('open','in_progress','resolved')),
  is_sensitive boolean NOT NULL DEFAULT false,
  related_person text,
  attachment_urls text[] NOT NULL DEFAULT '{}',
  deleted_at timestamptz,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_events_org_ben_date
  ON public.life_events (organization_id, beneficiary_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_life_events_followups
  ON public.life_events (organization_id, follow_up_status, follow_up_due)
  WHERE requires_follow_up = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_events TO authenticated;
GRANT ALL ON public.life_events TO service_role;
ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;

-- Sensitive events are invisible unless the member has the elevated role.
CREATE POLICY "org members select life_events" ON public.life_events
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (is_sensitive = false OR public.can_view_sensitive_life_events(organization_id))
  );

CREATE POLICY "org members insert life_events" ON public.life_events
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "org members update life_events" ON public.life_events
  FOR UPDATE TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (is_sensitive = false OR public.can_view_sensitive_life_events(organization_id))
  );

CREATE POLICY "org admins delete life_events" ON public.life_events
  FOR DELETE TO authenticated
  USING (public.can_view_sensitive_life_events(organization_id));

CREATE TRIGGER trg_life_events_touch BEFORE UPDATE ON public.life_events
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- ============ SEED FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.seed_default_life_event_types(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.life_event_types (organization_id, key, label, default_severity, is_sensitive_default, sort_order)
  VALUES
    (_org_id, 'bereavement',        'Bereavement / death in family', 'high',     false, 1),
    (_org_id, 'illness',            'Illness or hospitalisation',    'high',     true,  2),
    (_org_id, 'injury',             'Injury or accident',            'moderate', false, 3),
    (_org_id, 'relocation',         'Relocation / moved home',       'moderate', false, 4),
    (_org_id, 'school_change',      'School change',                 'low',      false, 5),
    (_org_id, 'dropped_out',        'Dropped out of school',         'critical', false, 6),
    (_org_id, 'returned_to_school', 'Returned to school',            'low',      false, 7),
    (_org_id, 'family_change',      'Family change',                 'moderate', false, 8),
    (_org_id, 'safeguarding',       'Safeguarding concern',          'critical', true,  9),
    (_org_id, 'legal',              'Legal or protection issue',     'high',     true,  10),
    (_org_id, 'income_shock',       'Income shock in household',     'high',     false, 11),
    (_org_id, 'achievement',        'Achievement or milestone',      'low',      false, 12),
    (_org_id, 'behavioural',        'Behavioural concern',           'moderate', true,  13),
    (_org_id, 'other',              'Other',                         'low',      false, 99)
  ON CONFLICT (organization_id, key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_default_document_types(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.document_types (organization_id, key, label, is_consent_type, requires_expiry, sort_order)
  VALUES
    (_org_id, 'consent_form',          'Consent Form',          true,  true,  1),
    (_org_id, 'photo_release',         'Photo Release',         true,  true,  2),
    (_org_id, 'intake_form',           'Intake Form',           false, false, 3),
    (_org_id, 'appreciation_letter',   'Appreciation Letter',   false, false, 4),
    (_org_id, 'recommendation_letter', 'Recommendation Letter', false, false, 5),
    (_org_id, 'school_report',         'School Report',         false, false, 6),
    (_org_id, 'medical_record',        'Medical Record',        false, false, 7),
    (_org_id, 'birth_certificate',     'Birth Certificate',     false, false, 8),
    (_org_id, 'other',                 'Other',                 false, false, 99)
  ON CONFLICT (organization_id, key) DO NOTHING;
END;
$$;

-- Auto-seed on new organisations
CREATE OR REPLACE FUNCTION public.tg_seed_org_catalogues()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_life_event_types(NEW.id);
  PERFORM public.seed_default_document_types(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_org_catalogues ON public.organizations;
CREATE TRIGGER trg_seed_org_catalogues AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.tg_seed_org_catalogues();

-- Backfill existing organisations
DO $$
DECLARE o RECORD;
BEGIN
  FOR o IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_life_event_types(o.id);
    PERFORM public.seed_default_document_types(o.id);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';