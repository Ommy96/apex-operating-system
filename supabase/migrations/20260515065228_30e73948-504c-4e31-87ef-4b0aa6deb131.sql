
CREATE OR REPLACE FUNCTION public.get_stakeholder_portal_data(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _access RECORD;
  _org RECORD;
  _result jsonb;
BEGIN
  SELECT * INTO _access
  FROM public.stakeholder_access
  WHERE access_token = _token
    AND is_active = true
    AND (token_expires_at IS NULL OR token_expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired_token');
  END IF;

  UPDATE public.stakeholder_access
  SET last_accessed_at = now()
  WHERE id = _access.id;

  SELECT id, name, slug, logo_url, organization_type, country, county
  INTO _org
  FROM public.organizations
  WHERE id = _access.organization_id;

  _result := jsonb_build_object(
    'access', jsonb_build_object(
      'full_name', _access.full_name,
      'email', _access.email,
      'stakeholder_type', _access.stakeholder_type,
      'access_level', _access.access_level,
      'can_view_beneficiary_data', _access.can_view_beneficiary_data,
      'can_download_reports', _access.can_download_reports,
      'token_expires_at', _access.token_expires_at
    ),
    'organization', to_jsonb(_org),
    'programs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'description', p.description,
        'status', p.status, 'start_date', p.start_date, 'end_date', p.end_date
      ))
      FROM public.programs p
      WHERE p.organization_id = _access.organization_id
        AND p.deleted_at IS NULL
        AND (
          _access.allowed_program_ids IS NULL
          OR array_length(_access.allowed_program_ids, 1) IS NULL
          OR p.id = ANY(_access.allowed_program_ids)
        )
    ), '[]'::jsonb),
    'indicators', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'name', i.name, 'level', i.level, 'unit', i.unit,
        'baseline_value', i.baseline_value, 'target_value', i.target_value,
        'target_date', i.target_date,
        'latest_value', (
          SELECT iv.actual_value FROM public.indicator_values iv
          WHERE iv.indicator_id = i.id
          ORDER BY iv.reporting_period_end DESC NULLS LAST, iv.created_at DESC
          LIMIT 1
        ),
        'latest_period', (
          SELECT iv.reporting_period_end FROM public.indicator_values iv
          WHERE iv.indicator_id = i.id
          ORDER BY iv.reporting_period_end DESC NULLS LAST, iv.created_at DESC
          LIMIT 1
        )
      ))
      FROM public.indicators i
      WHERE i.organization_id = _access.organization_id
        AND COALESCE(i.deleted_at::text, '') = ''
        AND (i.publish_status IS NULL OR i.publish_status = 'published')
        AND (
          _access.allowed_program_ids IS NULL
          OR array_length(_access.allowed_program_ids, 1) IS NULL
          OR i.program_id = ANY(_access.allowed_program_ids)
          OR i.program_id IS NULL
        )
    ), '[]'::jsonb),
    'grants', CASE WHEN _access.access_level IN ('detailed','full') THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', g.id, 'name', g.name, 'donor_name', g.donor_name,
        'amount', g.amount, 'currency', g.currency,
        'start_date', g.start_date, 'end_date', g.end_date, 'status', g.status
      ))
      FROM public.grants g
      WHERE g.organization_id = _access.organization_id
        AND (
          _access.allowed_grant_ids IS NULL
          OR array_length(_access.allowed_grant_ids, 1) IS NULL
          OR g.id = ANY(_access.allowed_grant_ids)
        )
    ), '[]'::jsonb) ELSE '[]'::jsonb END,
    'beneficiary_summary', CASE WHEN _access.can_view_beneficiary_data THEN jsonb_build_object(
      'total', (SELECT COUNT(*) FROM public.beneficiaries WHERE organization_id = _access.organization_id AND deleted_at IS NULL),
      'active', (SELECT COUNT(*) FROM public.beneficiaries WHERE organization_id = _access.organization_id AND deleted_at IS NULL AND status = 'active')
    ) ELSE NULL END
  );

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stakeholder_portal_data(text) TO anon, authenticated;
