CREATE OR REPLACE FUNCTION public.user_is_org_elevated(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = _user_id AND om.organization_id = _org_id
      AND om.role IN ('owner','admin','org_admin','management')
  ) OR public.has_role(_user_id, 'admin'::user_role);
$function$;

REVOKE EXECUTE ON FUNCTION public.user_is_org_elevated(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_org_elevated(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';