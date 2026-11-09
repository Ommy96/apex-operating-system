DROP POLICY IF EXISTS "Authenticated users can delete org logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update org logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload org logos" ON storage.objects;
DROP POLICY IF EXISTS "Org logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Upload impact story photos" ON storage.objects;
DROP POLICY IF EXISTS "View impact story photos" ON storage.objects;

CREATE OR REPLACE FUNCTION public.is_org_admin_for_path(_org_folder text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _org_folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    EXISTS (SELECT 1 FROM public.organization_members m
            WHERE m.user_id = auth.uid() AND m.organization_id = _org_folder::uuid
              AND lower(m.role::text) = 'admin')
    OR public.has_role(auth.uid(), 'admin')
  ELSE false END
$$;
REVOKE EXECUTE ON FUNCTION public.is_org_admin_for_path(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_org_admin_for_path(text) TO authenticated;

CREATE POLICY "org-logos public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'org-logos');
CREATE POLICY "org-logos org admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org-logos' AND public.is_org_admin_for_path((storage.foldername(name))[1]));
CREATE POLICY "org-logos org admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'org-logos' AND public.is_org_admin_for_path((storage.foldername(name))[1]))
  WITH CHECK (bucket_id = 'org-logos' AND public.is_org_admin_for_path((storage.foldername(name))[1]));
CREATE POLICY "org-logos org admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'org-logos' AND public.is_org_admin_for_path((storage.foldername(name))[1]));

CREATE POLICY "impact-stories org read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'impact-stories' AND (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
         AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "impact-stories org insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'impact-stories' AND (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
         AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "impact-stories org update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'impact-stories' AND (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
         AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'impact-stories' AND (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
         AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "impact-stories org delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'impact-stories' AND (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
         AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid));

NOTIFY pgrst, 'reload schema';