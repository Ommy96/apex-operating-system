CREATE OR REPLACE FUNCTION public.list_org_staff(_org_id uuid)
RETURNS TABLE(user_id uuid, org_role text, full_name text, email text, job_title text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.user_id,
         om.role::text AS org_role,
         p.full_name,
         p.email,
         p.job_title
  FROM public.organization_members om
  LEFT JOIN public.profiles p ON p.user_id = om.user_id
  WHERE om.organization_id = _org_id
    AND (
      public.user_belongs_to_org(auth.uid(), _org_id)
      OR public.has_role(auth.uid(), 'admin'::user_role)
    )
  ORDER BY COALESCE(p.full_name, p.email, '');
$$;

REVOKE ALL ON FUNCTION public.list_org_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_org_staff(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';