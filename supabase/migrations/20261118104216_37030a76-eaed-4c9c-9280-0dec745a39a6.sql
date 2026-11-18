ALTER FUNCTION public.effective_beneficiary_visibility(uuid,uuid,uuid) SET SCHEMA app_private;
ALTER FUNCTION public.effective_household_visibility(uuid,uuid,uuid) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION app_private.effective_household_visibility(_user uuid, _h uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND _user = auth.uid() AND (
    public.user_is_org_elevated(_user, _org)
    OR EXISTS (SELECT 1 FROM public.rbac_user_role_assignments a JOIN public.rbac_roles r ON r.id = a.role_id
      WHERE a.user_id = _user AND a.organization_id = _org AND a.is_active AND r.is_active AND r.data_scope = 'organization')
    OR EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.household_id = _h AND b.organization_id = _org
        AND app_private.effective_beneficiary_visibility(_user, b.id, _org)))
$$;
REVOKE ALL ON FUNCTION app_private.effective_beneficiary_visibility(uuid,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.effective_household_visibility(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.effective_beneficiary_visibility(uuid,uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.effective_household_visibility(uuid,uuid,uuid) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';