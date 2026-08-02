
-- Capture-first Field Officer scope
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
    (_org_id, 'field_officer',   'Field Officer',      'Capture-first field data collection', '#059669', 'UserCheck', true, true),
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

  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _org_admin_role_id, p.id FROM public.rbac_permissions p
  ON CONFLICT DO NOTHING;

  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _pm_id, p.id FROM public.rbac_permissions p
  WHERE p.module NOT IN ('users','settings')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _me_id, p.id FROM public.rbac_permissions p
  WHERE p.action = 'view'
     OR p.module IN ('me','reports')
     OR (p.module = 'programs' AND p.action IN ('manage','view'))
  ON CONFLICT DO NOTHING;

  -- Field Officer: capture-first. No sensitive PII, no delete/export/approve.
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _fo_id, p.id FROM public.rbac_permissions p
  WHERE p.action NOT IN ('delete','export','approve')
    AND p.resource <> 'medical_info'
    AND (
         (p.module = 'beneficiaries' AND (p.action IN ('view','create','edit')
            OR (p.action = 'manage' AND p.resource IN ('documents','enrollment'))))
      OR (p.module = 'visitations')
      OR (p.module = 'attendance'  AND p.action IN ('view','create','edit'))
      OR (p.module = 'programs'    AND (p.action = 'view' OR (p.action = 'manage' AND p.resource = 'activities')))
      OR (p.module IN ('me','documents') AND p.action = 'view')
    )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _de_id, p.id FROM public.rbac_permissions p
  WHERE (p.module = 'beneficiaries' AND p.action IN ('view','create','edit') AND p.resource <> 'medical_info')
     OR (p.module IN ('programs','attendance','visitations') AND p.action = 'view')
  ON CONFLICT DO NOTHING;

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

-- Backfill: strip out-of-scope permissions from existing field officer / data entry roles
DELETE FROM public.rbac_role_permissions rp
USING public.rbac_roles r, public.rbac_permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name IN ('field_officer','data_entry')
  AND (p.resource = 'medical_info' OR p.action IN ('delete','export','approve'));

-- Backfill: ensure existing field officers have the full capture set
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
CROSS JOIN public.rbac_permissions p
WHERE r.name = 'field_officer'
  AND p.action NOT IN ('delete','export','approve')
  AND p.resource <> 'medical_info'
  AND (
       (p.module = 'beneficiaries' AND (p.action IN ('view','create','edit')
          OR (p.action = 'manage' AND p.resource IN ('documents','enrollment'))))
    OR (p.module = 'visitations')
    OR (p.module = 'attendance'  AND p.action IN ('view','create','edit'))
    OR (p.module = 'programs'    AND (p.action = 'view' OR (p.action = 'manage' AND p.resource = 'activities')))
    OR (p.module IN ('me','documents') AND p.action = 'view')
  )
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
