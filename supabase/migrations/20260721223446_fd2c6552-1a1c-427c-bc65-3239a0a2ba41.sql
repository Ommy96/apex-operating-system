
-- 1. Allow authenticated users to READ the permission catalogue (definitions only, not sensitive).
DROP POLICY IF EXISTS "Authenticated users can view rbac permissions" ON public.rbac_permissions;
CREATE POLICY "Authenticated users can view rbac permissions"
ON public.rbac_permissions FOR SELECT
TO authenticated
USING (true);

GRANT SELECT ON public.rbac_permissions TO authenticated;

-- 2. Helper: grant ALL permissions to org_admin roles (idempotent, re-runnable).
CREATE OR REPLACE FUNCTION public.grant_all_permissions_to_org_admins()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted_count integer;
BEGIN
  WITH ins AS (
    INSERT INTO public.rbac_role_permissions (role_id, permission_id)
    SELECT r.id, p.id
      FROM public.rbac_roles r
     CROSS JOIN public.rbac_permissions p
     WHERE r.name = 'org_admin' AND r.is_system_role = true
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO inserted_count FROM ins;
  RETURN inserted_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.grant_all_permissions_to_org_admins() TO service_role;

-- 3. Upgrade seed_default_org_roles: also grant subsets to Program Manager, M&E Officer,
--    Field Officer, Data Entry Clerk, Read-Only Viewer.
CREATE OR REPLACE FUNCTION public.seed_default_org_roles(_org_id uuid, _admin_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_admin_role_id uuid;
  _pm_id uuid; _me_id uuid; _fo_id uuid; _de_id uuid; _ro_id uuid;
BEGIN
  INSERT INTO public.rbac_roles (organization_id, name, display_name, description, color, icon, is_system_role, is_active)
  VALUES
    (_org_id, 'org_admin',       'Organization Admin', 'Full access to all organization features', '#7C3AED', 'Shield',    true, true),
    (_org_id, 'program_manager', 'Program Manager',    'Manage programs, projects and beneficiaries', '#2563EB', 'Briefcase', true, true),
    (_org_id, 'field_officer',   'Field Officer',      'Field data collection and beneficiary management', '#059669', 'UserCheck', true, true),
    (_org_id, 'me_officer',      'M&E Officer',        'Monitoring, evaluation and reporting', '#D97706', 'BarChart2', true, true),
    (_org_id, 'data_entry',      'Data Entry Clerk',   'Basic data entry and record management', '#6B7280', 'Edit3',     true, true),
    (_org_id, 'readonly_viewer', 'Read-Only Viewer',   'View-only access to organization data', '#9CA3AF', 'Eye',       true, true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO _org_admin_role_id FROM public.rbac_roles WHERE organization_id = _org_id AND name = 'org_admin';
  SELECT id INTO _pm_id             FROM public.rbac_roles WHERE organization_id = _org_id AND name = 'program_manager';
  SELECT id INTO _me_id             FROM public.rbac_roles WHERE organization_id = _org_id AND name = 'me_officer';
  SELECT id INTO _fo_id             FROM public.rbac_roles WHERE organization_id = _org_id AND name = 'field_officer';
  SELECT id INTO _de_id             FROM public.rbac_roles WHERE organization_id = _org_id AND name = 'data_entry';
  SELECT id INTO _ro_id             FROM public.rbac_roles WHERE organization_id = _org_id AND name = 'readonly_viewer';

  -- Admin: ALL permissions
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _org_admin_role_id, p.id FROM public.rbac_permissions p
  ON CONFLICT DO NOTHING;

  -- Program Manager: everything except users/settings admin
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _pm_id, p.id FROM public.rbac_permissions p
  WHERE p.module NOT IN ('users','settings')
  ON CONFLICT DO NOTHING;

  -- M&E Officer: view broad + manage me/reports/indicators
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _me_id, p.id FROM public.rbac_permissions p
  WHERE p.action = 'view'
     OR p.module IN ('me','reports')
     OR (p.module = 'programs' AND p.action IN ('manage','view'))
  ON CONFLICT DO NOTHING;

  -- Field Officer: view + create beneficiaries/visitations + view programs/projects
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _fo_id, p.id FROM public.rbac_permissions p
  WHERE (p.module = 'beneficiaries' AND p.action IN ('view','create','edit'))
     OR (p.module = 'visitations'   AND p.action IN ('view','create','edit'))
     OR (p.module IN ('programs','attendance','me','documents') AND p.action = 'view')
  ON CONFLICT DO NOTHING;

  -- Data Entry Clerk: create/edit beneficiaries, view programs
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _de_id, p.id FROM public.rbac_permissions p
  WHERE (p.module = 'beneficiaries' AND p.action IN ('view','create','edit'))
     OR (p.module IN ('programs','attendance','visitations') AND p.action = 'view')
  ON CONFLICT DO NOTHING;

  -- Read-Only Viewer: view-only across everything except sensitive settings/users
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _ro_id, p.id FROM public.rbac_permissions p
  WHERE p.action = 'view' AND p.module NOT IN ('users','settings')
  ON CONFLICT DO NOTHING;

  IF _admin_user_id IS NOT NULL THEN
    INSERT INTO public.rbac_user_role_assignments (user_id, organization_id, role_id, assigned_by, is_active)
    VALUES (_admin_user_id, _org_id, _org_admin_role_id, _admin_user_id, true)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$;

-- 4. Backfill: ensure every existing org has all default roles + full subsets.
DO $$
DECLARE
  o RECORD;
  founder_id uuid;
BEGIN
  FOR o IN SELECT id FROM public.organizations LOOP
    SELECT user_id INTO founder_id
      FROM public.organization_members
     WHERE organization_id = o.id AND role = 'admin'
     ORDER BY joined_at ASC NULLS LAST LIMIT 1;
    PERFORM public.seed_default_org_roles(o.id, founder_id);
  END LOOP;
END $$;

-- 5. Belt-and-braces: force-grant all perms to every org_admin system role.
SELECT public.grant_all_permissions_to_org_admins();

-- 6. Audit log entry
INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, metadata)
SELECT 'rbac_permissions_backfilled', 'organization', o.id, NULL,
       jsonb_build_object('reason', 'permission_seeding_backfill_and_catalogue_rls_fix')
  FROM public.organizations o;

NOTIFY pgrst, 'reload schema';
