
-- 1. Fix seed_default_org_roles: remove reference to non-existent sort_order column.
CREATE OR REPLACE FUNCTION public.seed_default_org_roles(_org_id uuid, _admin_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_admin_role_id uuid;
BEGIN
  INSERT INTO public.rbac_roles (organization_id, name, display_name, description, color, icon, is_system_role, is_active)
  VALUES
    (_org_id, 'org_admin',       'Organization Admin', 'Full access to all organization features', '#7C3AED', 'Shield',    true, true),
    (_org_id, 'program_manager', 'Program Manager',    'Manage programs, projects and beneficiaries', '#2563EB', 'Briefcase', true, true),
    (_org_id, 'field_officer',   'Field Officer',      'Field data collection and beneficiary management', '#059669', 'UserCheck', true, true),
    (_org_id, 'me_officer',      'M&E Officer',        'Monitoring, evaluation and reporting', '#D97706', 'BarChart2', true, true),
    (_org_id, 'data_entry',      'Data Entry Clerk',   'Basic data entry and record management', '#6B7280', 'Edit3',     true, true),
    (_org_id, 'readonly_viewer', 'Read-Only Viewer',   'View-only access to organization data', '#9CA3AF', 'Eye',       true, true);

  SELECT id INTO _org_admin_role_id
    FROM public.rbac_roles
   WHERE organization_id = _org_id AND name = 'org_admin';

  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _org_admin_role_id, p.id FROM public.rbac_permissions p
  ON CONFLICT DO NOTHING;

  IF _admin_user_id IS NOT NULL THEN
    INSERT INTO public.rbac_user_role_assignments (user_id, organization_id, role_id, assigned_by, is_active)
    VALUES (_admin_user_id, _org_id, _org_admin_role_id, _admin_user_id, true)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$;

-- 2. Backfill: seed roles for every org that has none, and promote the founding member to admin.
DO $$
DECLARE
  o RECORD;
  founder_id uuid;
BEGIN
  FOR o IN
    SELECT id FROM public.organizations org
    WHERE NOT EXISTS (SELECT 1 FROM public.rbac_roles r WHERE r.organization_id = org.id)
  LOOP
    -- Prefer an existing admin; else earliest member.
    SELECT user_id INTO founder_id
      FROM public.organization_members
     WHERE organization_id = o.id AND role = 'admin'
     ORDER BY joined_at ASC NULLS LAST
     LIMIT 1;

    IF founder_id IS NULL THEN
      SELECT user_id INTO founder_id
        FROM public.organization_members
       WHERE organization_id = o.id
       ORDER BY joined_at ASC NULLS LAST
       LIMIT 1;
    END IF;

    IF founder_id IS NOT NULL THEN
      UPDATE public.organization_members
         SET role = 'admin'
       WHERE organization_id = o.id AND user_id = founder_id AND role <> 'admin';

      UPDATE public.profiles
         SET role = 'admin'
       WHERE user_id = founder_id AND (role IS NULL OR role <> 'admin')
         AND organization_id = o.id;
    END IF;

    PERFORM public.seed_default_org_roles(o.id, founder_id);

    INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, metadata)
    VALUES ('org_roles_backfilled', 'organization', o.id, founder_id,
            jsonb_build_object('reason', 'seed_default_org_roles previously failed', 'founder_user_id', founder_id));
  END LOOP;
END $$;

-- 3. Make sure every existing org_admin role has all permissions (in case new ones were added since seeding).
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.rbac_roles r
 CROSS JOIN public.rbac_permissions p
 WHERE r.name = 'org_admin' AND r.is_system_role = true
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
