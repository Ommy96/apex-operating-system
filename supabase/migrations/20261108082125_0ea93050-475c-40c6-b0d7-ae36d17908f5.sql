CREATE OR REPLACE FUNCTION app_private.get_staff_task_workload(_org uuid)
RETURNS TABLE(staff_user_id uuid,open_tasks bigint,overdue_tasks bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,app_private AS $$
BEGIN
  IF NOT public.user_belongs_to_org(auth.uid(),_org) OR app_private.user_is_donor_for_org(auth.uid(),_org) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF NOT (public.user_is_org_elevated(auth.uid(),_org) OR public.user_has_permission(auth.uid(),_org,'tasks','manage','tasks') OR public.user_has_permission(auth.uid(),_org,'hr','view','staff')) THEN
    RETURN QUERY SELECT t.assigned_to,count(*) FILTER(WHERE t.status NOT IN ('completed','cancelled'))::bigint,count(*) FILTER(WHERE t.status NOT IN ('completed','cancelled') AND t.due_date<CURRENT_DATE)::bigint FROM public.staff_tasks t WHERE t.organization_id=_org AND t.assigned_to=auth.uid() GROUP BY t.assigned_to;
  ELSE
    RETURN QUERY SELECT t.assigned_to,count(*) FILTER(WHERE t.status NOT IN ('completed','cancelled'))::bigint,count(*) FILTER(WHERE t.status NOT IN ('completed','cancelled') AND t.due_date<CURRENT_DATE)::bigint FROM public.staff_tasks t WHERE t.organization_id=_org AND t.assigned_to IS NOT NULL AND app_private.staff_task_is_visible_scoped(auth.uid(),t.id,_org) GROUP BY t.assigned_to;
  END IF;
END $$;

DO $$
DECLARE _definition text; _updated text;
BEGIN
  _definition:=pg_get_functiondef('public.seed_default_org_roles(uuid,uuid)'::regprocedure);
  _updated:=replace(_definition,
    '  IF _admin_user_id IS NOT NULL THEN',
$seed$  INSERT INTO public.rbac_role_permissions (role_id,permission_id)
  SELECT r.id,p.id FROM public.rbac_roles r CROSS JOIN public.rbac_permissions p
  WHERE r.organization_id=_org_id AND r.is_system_role AND (
    (r.name IN ('staff_member','field_officer','data_entry') AND p.module IN ('tasks','cases') AND p.action IN ('view','manage') AND NOT (p.module='cases' AND p.resource='sensitive'))
    OR (r.name IN ('me_officer','readonly_viewer') AND p.module IN ('tasks','cases') AND p.action='view' AND NOT (p.module='cases' AND p.resource='sensitive'))
    OR (r.name IN ('program_manager','project_manager') AND p.module IN ('tasks','cases') AND NOT (p.module='cases' AND p.resource='sensitive'))
  ) ON CONFLICT DO NOTHING;

  IF _admin_user_id IS NOT NULL THEN$seed$);
  IF _updated=_definition THEN RAISE EXCEPTION 'Unable to extend role seeding: expected anchor was not found'; END IF;
  EXECUTE _updated;
END $$;

REVOKE ALL ON FUNCTION app_private.get_staff_task_workload(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION app_private.get_staff_task_workload(uuid) TO authenticated,service_role;
NOTIFY pgrst, 'reload schema';