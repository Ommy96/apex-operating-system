CREATE OR REPLACE FUNCTION public.get_program_aggregate(_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org uuid;
  _total int;
  _active int;
  _male int;
  _female int;
  _min_cell CONSTANT int := 5;
BEGIN
  SELECT organization_id INTO _org FROM public.programs WHERE id = _program_id;
  IF _org IS NULL THEN
    RAISE EXCEPTION 'Programme not found';
  END IF;
  IF NOT (public.user_belongs_to_org(auth.uid(), _org) OR public.has_role(auth.uid(), 'admin'::user_role)) THEN
    RAISE EXCEPTION 'Not authorised for this organisation';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE lower(bs.status::text) IN ('active','enrolled')),
         count(*) FILTER (WHERE lower(b.gender::text) = 'male'),
         count(*) FILTER (WHERE lower(b.gender::text) = 'female')
  INTO _total, _active, _male, _female
  FROM public.beneficiary_services bs
  JOIN public.beneficiaries b ON b.id = bs.beneficiary_id
  WHERE bs.program_id = _program_id AND b.organization_id = _org AND b.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'program_id', _program_id,
    'total_beneficiaries', CASE WHEN _total >= _min_cell THEN _total END,
    'active_beneficiaries', CASE WHEN _active >= _min_cell THEN _active END,
    'male', CASE WHEN _male >= _min_cell THEN _male END,
    'female', CASE WHEN _female >= _min_cell THEN _female END,
    'minimum_cell_size', _min_cell
  );
END;
$function$;

NOTIFY pgrst, 'reload schema';