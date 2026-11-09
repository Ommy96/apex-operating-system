CREATE SCHEMA IF NOT EXISTS app_private;
ALTER FUNCTION public.get_donor_funded_needs(uuid) SET SCHEMA app_private;
REVOKE ALL ON FUNCTION app_private.get_donor_funded_needs(uuid) FROM public, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.get_donor_funded_needs(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_donor_funded_needs(_beneficiary uuid)
RETURNS TABLE(need_type_id uuid, need_name text, need_status text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM app_private.get_donor_funded_needs(_beneficiary);
$$;
REVOKE ALL ON FUNCTION public.get_donor_funded_needs(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_donor_funded_needs(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';