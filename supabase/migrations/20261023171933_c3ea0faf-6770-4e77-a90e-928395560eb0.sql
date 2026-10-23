-- 1) Standardise notification preferences on organization_id (rename keeps all data + unique constraint)
ALTER TABLE public.user_notification_preferences RENAME COLUMN org_id TO organization_id;

-- 2) Beneficiary-data settings: only org owners/admins (or super admin) may change them,
--    matching the rules already on organizations and org_settings.
DROP POLICY IF EXISTS "Org admins can insert config" ON public.org_beneficiary_config;
DROP POLICY IF EXISTS "Org admins can update config" ON public.org_beneficiary_config;
CREATE POLICY "Org admins can insert config" ON public.org_beneficiary_config
  FOR INSERT TO authenticated
  WITH CHECK (public.get_org_member_role(auth.uid(), organization_id) = ANY (ARRAY['owner','admin']) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Org admins can update config" ON public.org_beneficiary_config
  FOR UPDATE TO authenticated
  USING (public.get_org_member_role(auth.uid(), organization_id) = ANY (ARRAY['owner','admin']) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.get_org_member_role(auth.uid(), organization_id) = ANY (ARRAY['owner','admin']) OR public.is_super_admin(auth.uid()));

-- 3) Backfill profiles whose organisation link was never written (invite sign-up ran before a session existed)
UPDATE public.profiles p
SET organization_id = om.organization_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, organization_id
  FROM public.organization_members
  ORDER BY user_id, is_primary DESC NULLS LAST, created_at ASC
) om
WHERE om.user_id = p.user_id AND p.organization_id IS NULL;

NOTIFY pgrst, 'reload schema';