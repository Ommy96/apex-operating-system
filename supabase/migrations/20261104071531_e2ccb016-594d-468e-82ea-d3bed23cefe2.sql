REVOKE EXECUTE ON FUNCTION public.user_is_org_elevated(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_only_roles(uuid, uuid, text[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_is_program_scoped(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_is_field_scoped(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_assigned_program_ids(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_assigned_project_ids(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.beneficiary_visible_scoped(uuid, uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.household_visible_scoped(uuid, uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_program_aggregate(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revoke_staff_access(uuid, uuid, text) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.user_is_org_elevated(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_only_roles(uuid, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_program_scoped(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_field_scoped(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_assigned_program_ids(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_assigned_project_ids(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.beneficiary_visible_scoped(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.household_visible_scoped(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_aggregate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_staff_access(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';