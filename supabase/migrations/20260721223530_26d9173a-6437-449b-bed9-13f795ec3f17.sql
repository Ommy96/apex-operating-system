
DELETE FROM public.rbac_role_permissions a
USING public.rbac_role_permissions b
WHERE a.ctid < b.ctid
  AND a.role_id = b.role_id
  AND a.permission_id = b.permission_id;

NOTIFY pgrst, 'reload schema';
