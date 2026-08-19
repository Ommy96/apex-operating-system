CREATE TABLE IF NOT EXISTS public.household_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  beneficiary_id uuid NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  role_in_household text,
  relationship_to_head text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  left_reason text,
  left_note text,
  removed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_memberships TO authenticated;
GRANT ALL ON public.household_memberships TO service_role;

ALTER TABLE public.household_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view household memberships" ON public.household_memberships;
CREATE POLICY "Org members can view household memberships" ON public.household_memberships
  FOR SELECT TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Org members can insert household memberships" ON public.household_memberships;
CREATE POLICY "Org members can insert household memberships" ON public.household_memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_org(auth.uid(), organization_id) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Org members can update household memberships" ON public.household_memberships;
CREATE POLICY "Org members can update household memberships" ON public.household_memberships
  FOR UPDATE TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id) OR is_super_admin(auth.uid()))
  WITH CHECK (user_belongs_to_org(auth.uid(), organization_id) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Org members can delete household memberships" ON public.household_memberships;
CREATE POLICY "Org members can delete household memberships" ON public.household_memberships
  FOR DELETE TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id) OR is_super_admin(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS household_memberships_active_uniq
  ON public.household_memberships (household_id, beneficiary_id)
  WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS household_memberships_household_idx ON public.household_memberships (household_id);
CREATE INDEX IF NOT EXISTS household_memberships_beneficiary_idx ON public.household_memberships (beneficiary_id);

DROP TRIGGER IF EXISTS household_memberships_touch ON public.household_memberships;
CREATE TRIGGER household_memberships_touch BEFORE UPDATE ON public.household_memberships
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Backfill current members as active memberships
INSERT INTO public.household_memberships (organization_id, household_id, beneficiary_id, joined_at, role_in_household)
SELECT b.organization_id, b.household_id, b.id, COALESCE(b.created_at, now()),
       CASE WHEN h.head_of_household_id = b.id THEN 'head' ELSE NULL END
FROM public.beneficiaries b
JOIN public.households h ON h.id = b.household_id
WHERE b.household_id IS NOT NULL AND b.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Keep a membership row whenever a beneficiary is placed in a household
CREATE OR REPLACE FUNCTION public.tg_sync_household_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.household_id IS DISTINCT FROM OLD.household_id THEN
    IF OLD.household_id IS NOT NULL THEN
      UPDATE public.household_memberships
         SET left_at = COALESCE(left_at, now())
       WHERE household_id = OLD.household_id
         AND beneficiary_id = NEW.id
         AND left_at IS NULL;
    END IF;
    IF NEW.household_id IS NOT NULL THEN
      INSERT INTO public.household_memberships (organization_id, household_id, beneficiary_id)
      VALUES (NEW.organization_id, NEW.household_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_household_membership ON public.beneficiaries;
CREATE TRIGGER trg_sync_household_membership
  AFTER UPDATE OF household_id ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_household_membership();

CREATE OR REPLACE FUNCTION public.remove_household_member(
  _beneficiary_id uuid,
  _household_id uuid,
  _reason text,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid;
  _name text;
  _hname text;
  _membership_id uuid;
  _life_event_id uuid;
  _type_id uuid;
BEGIN
  SELECT organization_id, display_name INTO _org, _name
    FROM public.beneficiaries WHERE id = _beneficiary_id;
  IF _org IS NULL THEN
    RAISE EXCEPTION 'Beneficiary not found';
  END IF;
  IF NOT (user_belongs_to_org(auth.uid(), _org) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised for this organisation';
  END IF;

  SELECT household_name INTO _hname FROM public.households
   WHERE id = _household_id AND organization_id = _org;
  IF _hname IS NULL AND NOT EXISTS (
    SELECT 1 FROM public.households WHERE id = _household_id AND organization_id = _org
  ) THEN
    RAISE EXCEPTION 'Household not found in this organisation';
  END IF;

  UPDATE public.beneficiaries
     SET household_id = NULL
   WHERE id = _beneficiary_id AND household_id = _household_id;

  UPDATE public.household_memberships
     SET left_at = now(), left_reason = _reason, left_note = _note, removed_by = auth.uid()
   WHERE household_id = _household_id AND beneficiary_id = _beneficiary_id
     AND left_at IS NOT NULL AND left_reason IS NULL;

  UPDATE public.household_memberships
     SET left_at = COALESCE(left_at, now()), left_reason = _reason, left_note = _note, removed_by = auth.uid()
   WHERE household_id = _household_id AND beneficiary_id = _beneficiary_id
   RETURNING id INTO _membership_id;

  UPDATE public.households
     SET head_of_household_id = NULL
   WHERE id = _household_id AND head_of_household_id = _beneficiary_id;

  IF _reason IS DISTINCT FROM 'added_in_error' THEN
    SELECT id INTO _type_id FROM public.life_event_types
      WHERE organization_id = _org AND key = 'family_change' LIMIT 1;
    INSERT INTO public.life_events (
      organization_id, beneficiary_id, event_type, life_event_type_id, occurred_on,
      recorded_by, severity, title, description
    ) VALUES (
      _org, _beneficiary_id, 'family_change', _type_id, CURRENT_DATE,
      auth.uid(), 'low',
      'Left household' || COALESCE(' — ' || _hname, ''),
      'Removed from household. Reason: ' || COALESCE(_reason, 'unspecified')
        || COALESCE('. Note: ' || _note, '')
    ) RETURNING id INTO _life_event_id;
  END IF;

  INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, old_values, new_values, metadata)
  VALUES ('remove_household_member', 'household', _household_id, auth.uid(),
          jsonb_build_object('beneficiary_id', _beneficiary_id, 'household_id', _household_id),
          jsonb_build_object('left_reason', _reason, 'left_note', _note),
          jsonb_build_object('beneficiary_name', _name, 'household_name', _hname));

  RETURN jsonb_build_object('membership_id', _membership_id, 'life_event_id', _life_event_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_household_member(
  _beneficiary_id uuid,
  _household_id uuid,
  _life_event_id uuid DEFAULT NULL,
  _restore_as_head boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.beneficiaries WHERE id = _beneficiary_id;
  IF _org IS NULL THEN
    RAISE EXCEPTION 'Beneficiary not found';
  END IF;
  IF NOT (user_belongs_to_org(auth.uid(), _org) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised for this organisation';
  END IF;

  UPDATE public.beneficiaries SET household_id = _household_id WHERE id = _beneficiary_id;

  UPDATE public.household_memberships
     SET left_at = NULL, left_reason = NULL, left_note = NULL, removed_by = NULL
   WHERE household_id = _household_id AND beneficiary_id = _beneficiary_id;

  IF _restore_as_head THEN
    UPDATE public.households SET head_of_household_id = _beneficiary_id WHERE id = _household_id;
  END IF;

  IF _life_event_id IS NOT NULL THEN
    DELETE FROM public.life_events WHERE id = _life_event_id AND organization_id = _org;
  END IF;

  INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, new_values)
  VALUES ('restore_household_member', 'household', _household_id, auth.uid(),
          jsonb_build_object('beneficiary_id', _beneficiary_id));

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.remove_household_member(uuid, uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_household_member(uuid, uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_household_member(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_household_member(uuid, uuid, uuid, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';