
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS archive_note text;

COMMENT ON COLUMN public.beneficiaries.deleted_at IS 'Archive timestamp. Non-null = archived (restorable). Hard deletes remove the row entirely.';

CREATE OR REPLACE FUNCTION public.beneficiary_link_counts(_beneficiary_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid;
  _res jsonb;
BEGIN
  SELECT organization_id INTO _org FROM public.beneficiaries WHERE id = _beneficiary_id;
  IF _org IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT (public.user_belongs_to_org(auth.uid(), _org) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised for this organisation';
  END IF;

  SELECT jsonb_build_object(
    'enrollments', (SELECT count(*) FROM public.beneficiary_services s WHERE s.beneficiary_id = _beneficiary_id),
    'needs', (SELECT count(*) FROM public.beneficiary_needs n WHERE n.beneficiary_id = _beneficiary_id),
    'guardians', (SELECT count(*) FROM public.beneficiary_guardians g WHERE g.beneficiary_id = _beneficiary_id),
    'sponsorships', (SELECT count(*) FROM public.beneficiary_donors d WHERE d.beneficiary_id = _beneficiary_id),
    'allocations', (SELECT count(*) FROM public.allocation_line_items a WHERE a.beneficiary_id = _beneficiary_id),
    'visits', (
      (SELECT count(*) FROM public.home_visits h WHERE h.beneficiary_id = _beneficiary_id AND h.deleted_at IS NULL)
      + (SELECT count(*) FROM public.school_visits v WHERE v.beneficiary_id = _beneficiary_id AND v.deleted_at IS NULL)
    ),
    'documents', (SELECT count(*) FROM public.beneficiary_uploads u WHERE u.beneficiary_id = _beneficiary_id),
    'timeline', (SELECT count(*) FROM public.beneficiary_progress_logs l WHERE l.beneficiary_id = _beneficiary_id)
  ) INTO _res;

  RETURN _res || jsonb_build_object(
    'total',
      (_res->>'enrollments')::int + (_res->>'needs')::int + (_res->>'guardians')::int
      + (_res->>'sponsorships')::int + (_res->>'allocations')::int + (_res->>'visits')::int
      + (_res->>'documents')::int + (_res->>'timeline')::int
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_beneficiary(_beneficiary_id uuid, _reason text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.beneficiaries WHERE id = _beneficiary_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'Record not found'; END IF;
  IF NOT (public.user_belongs_to_org(auth.uid(), _org) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised for this organisation';
  END IF;

  UPDATE public.beneficiaries
     SET deleted_at = now(), archived_by = auth.uid(),
         archive_reason = _reason, archive_note = _note
   WHERE id = _beneficiary_id;

  INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, metadata)
  VALUES ('archive', 'beneficiary', _beneficiary_id, auth.uid(),
          jsonb_build_object('reason', _reason, 'note', _note, 'organization_id', _org));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.unarchive_beneficiary(_beneficiary_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.beneficiaries WHERE id = _beneficiary_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'Record not found'; END IF;
  IF NOT (public.user_belongs_to_org(auth.uid(), _org) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised for this organisation';
  END IF;

  UPDATE public.beneficiaries
     SET deleted_at = NULL, archived_by = NULL, archive_reason = NULL, archive_note = NULL
   WHERE id = _beneficiary_id;

  INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, metadata)
  VALUES ('unarchive', 'beneficiary', _beneficiary_id, auth.uid(),
          jsonb_build_object('organization_id', _org));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.hard_delete_beneficiary(_beneficiary_id uuid, _force boolean DEFAULT false, _justification text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid;
  _counts jsonb;
  _role text;
  _code text;
BEGIN
  SELECT organization_id, beneficiary_code INTO _org, _code FROM public.beneficiaries WHERE id = _beneficiary_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'Record not found'; END IF;
  IF NOT (public.user_belongs_to_org(auth.uid(), _org) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised for this organisation';
  END IF;

  _counts := public.beneficiary_link_counts(_beneficiary_id);

  IF (_counts->>'total')::int > 0 AND NOT _force THEN
    RETURN jsonb_build_object('success', false, 'blocked', true, 'counts', _counts);
  END IF;

  IF _force THEN
    _role := public.get_org_member_role(auth.uid(), _org);
    IF NOT (_role IN ('owner', 'admin', 'org_admin') OR public.is_super_admin(auth.uid())) THEN
      RAISE EXCEPTION 'Only an organisation administrator can permanently erase a record';
    END IF;
  END IF;

  INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, old_values, metadata)
  VALUES ('hard_delete', 'beneficiary', _beneficiary_id, auth.uid(),
          to_jsonb((SELECT b FROM public.beneficiaries b WHERE b.id = _beneficiary_id)),
          jsonb_build_object('organization_id', _org, 'beneficiary_code', _code,
                             'forced', _force, 'justification', _justification, 'destroyed', _counts));

  DELETE FROM public.beneficiary_progress_logs WHERE beneficiary_id = _beneficiary_id;
  DELETE FROM public.beneficiary_uploads WHERE beneficiary_id = _beneficiary_id;
  DELETE FROM public.beneficiary_guardians WHERE beneficiary_id = _beneficiary_id;
  DELETE FROM public.beneficiary_needs WHERE beneficiary_id = _beneficiary_id;
  DELETE FROM public.beneficiary_donors WHERE beneficiary_id = _beneficiary_id;
  DELETE FROM public.allocation_line_items WHERE beneficiary_id = _beneficiary_id;
  DELETE FROM public.beneficiary_services WHERE beneficiary_id = _beneficiary_id;
  DELETE FROM public.home_visits WHERE beneficiary_id = _beneficiary_id;
  DELETE FROM public.school_visits WHERE beneficiary_id = _beneficiary_id;
  DELETE FROM public.beneficiaries WHERE id = _beneficiary_id;

  RETURN jsonb_build_object('success', true, 'destroyed', _counts);
END;
$$;

REVOKE ALL ON FUNCTION public.beneficiary_link_counts(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_beneficiary(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unarchive_beneficiary(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.hard_delete_beneficiary(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.beneficiary_link_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_beneficiary(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unarchive_beneficiary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hard_delete_beneficiary(uuid, boolean, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
