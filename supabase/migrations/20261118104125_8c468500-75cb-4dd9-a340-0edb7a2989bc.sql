-- 1. Data scope on roles ---------------------------------------------------
ALTER TABLE public.rbac_roles ADD COLUMN IF NOT EXISTS data_scope text NOT NULL DEFAULT 'assigned';
ALTER TABLE public.rbac_roles DROP CONSTRAINT IF EXISTS rbac_roles_data_scope_check;
ALTER TABLE public.rbac_roles ADD CONSTRAINT rbac_roles_data_scope_check
  CHECK (data_scope IN ('organization','program','project','assigned'));

CREATE OR REPLACE FUNCTION app_private.default_role_data_scope(_role_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE lower(_role_name)
    WHEN 'org_admin' THEN 'organization'
    WHEN 'me_officer' THEN 'organization'
    WHEN 'management' THEN 'organization'
    WHEN 'readonly_viewer' THEN 'organization'
    WHEN 'program_manager' THEN 'program'
    WHEN 'project_manager' THEN 'project'
    ELSE 'assigned' END
$$;
REVOKE ALL ON FUNCTION app_private.default_role_data_scope(text) FROM PUBLIC, anon, authenticated;

UPDATE public.rbac_roles SET data_scope = app_private.default_role_data_scope(name)
WHERE is_system_role = true;

-- 2. One definition of standard role permissions ---------------------------
CREATE OR REPLACE FUNCTION public.apply_default_role_permissions(_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM public.rbac_roles r
  CROSS JOIN public.rbac_permissions p
  WHERE r.organization_id = _org_id
    AND r.is_system_role = true
    AND CASE lower(r.name)
      WHEN 'org_admin' THEN true
      WHEN 'program_manager' THEN
        p.module NOT IN ('users','settings') AND NOT (p.module='cases' AND p.resource='sensitive')
      WHEN 'project_manager' THEN
        p.module NOT IN ('users','settings') AND p.action <> 'delete' AND NOT (p.module='cases' AND p.resource='sensitive')
      WHEN 'staff_member' THEN
        (p.module = 'beneficiaries' AND p.action IN ('view','create','edit') AND p.resource <> 'medical_info')
        OR (p.module IN ('visitations','attendance','documents') AND p.action IN ('view','create','edit'))
        OR (p.module = 'programs' AND p.action = 'view')
        OR (p.module = 'me' AND p.action = 'view')
        OR (p.module IN ('tasks','cases') AND p.action IN ('view','manage') AND NOT (p.module='cases' AND p.resource='sensitive'))
      WHEN 'me_officer' THEN
        ((p.action = 'view' AND NOT (p.module='cases' AND p.resource='sensitive'))
         OR p.module IN ('me','reports')
         OR (p.module = 'programs' AND p.action IN ('manage','view')))
      WHEN 'field_officer' THEN
        (p.action NOT IN ('delete','export','approve')
          AND p.resource <> 'medical_info'
          AND NOT (p.module='cases' AND p.resource='sensitive')
          AND ((p.module = 'beneficiaries' AND (p.action IN ('view','create','edit') OR (p.action = 'manage' AND p.resource IN ('documents','enrollment'))))
            OR p.module = 'visitations'
            OR (p.module = 'attendance' AND p.action IN ('view','create','edit'))
            OR (p.module = 'programs' AND (p.action = 'view' OR (p.action = 'manage' AND p.resource = 'activities')))
            OR (p.module IN ('me','documents') AND p.action = 'view')))
        OR (p.module IN ('tasks','cases') AND p.action IN ('view','manage') AND NOT (p.module='cases' AND p.resource='sensitive'))
      WHEN 'data_entry' THEN
        (((p.module = 'beneficiaries' AND p.action IN ('view','create','edit') AND p.resource <> 'medical_info')
          OR (p.module IN ('programs','attendance','visitations') AND p.action = 'view'))
         AND NOT (p.module='cases' AND p.resource='sensitive'))
        OR (p.module IN ('tasks','cases') AND p.action IN ('view','manage') AND NOT (p.module='cases' AND p.resource='sensitive'))
      WHEN 'readonly_viewer' THEN
        p.action = 'view' AND p.module NOT IN ('users','settings') AND NOT (p.module='cases' AND p.resource='sensitive')
      ELSE false
    END
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_default_role_permissions(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.seed_default_org_roles(_org_id uuid, _admin_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org_admin_role_id uuid;
BEGIN
  INSERT INTO public.rbac_roles (organization_id, name, display_name, description, color, icon, is_system_role, is_active, data_scope)
  SELECT _org_id, v.name, v.display_name, v.description, v.color, v.icon, true, true, app_private.default_role_data_scope(v.name)
  FROM (VALUES
    ('org_admin',       'Organization Admin', 'Full access to all organization features', '#7C3AED', 'Shield'),
    ('program_manager', 'Program Manager',    'Manage programs, projects and beneficiaries', '#2563EB', 'Briefcase'),
    ('project_manager', 'Project Manager',    'Manage assigned projects, activities and project teams', '#0EA5E9', 'FolderKanban'),
    ('staff_member',    'Staff Member',       'Operational staff workspace for assigned beneficiaries and work', '#6366F1', 'Users'),
    ('field_officer',   'Field Officer',      'Capture-first field data collection', '#059669', 'UserCheck'),
    ('me_officer',      'M&E Officer',        'Monitoring, evaluation and reporting', '#D97706', 'BarChart2'),
    ('data_entry',      'Data Entry Clerk',   'Basic data entry and record management', '#6B7280', 'Edit3'),
    ('readonly_viewer', 'Read-Only Viewer',   'View-only access to organization data', '#9CA3AF', 'Eye')
  ) AS v(name, display_name, description, color, icon)
  ON CONFLICT DO NOTHING;

  PERFORM public.apply_default_role_permissions(_org_id);

  IF _admin_user_id IS NOT NULL THEN
    SELECT id INTO _org_admin_role_id FROM public.rbac_roles
    WHERE organization_id = _org_id AND name = 'org_admin' ORDER BY created_at LIMIT 1;
    INSERT INTO public.rbac_user_role_assignments (user_id, organization_id, role_id, assigned_by, is_active)
    VALUES (_admin_user_id, _org_id, _org_admin_role_id, _admin_user_id, true)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Backfill every existing organisation once.
DO $$ DECLARE o record; BEGIN
  FOR o IN SELECT DISTINCT organization_id FROM public.rbac_roles WHERE organization_id IS NOT NULL AND is_system_role LOOP
    PERFORM public.apply_default_role_permissions(o.organization_id);
  END LOOP;
END $$;

-- 3. Explicit, narrow-by-default visibility ---------------------------------
CREATE OR REPLACE FUNCTION public.effective_beneficiary_visibility(_user uuid, _b uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND _user = auth.uid() AND (
    public.user_is_org_elevated(_user, _org)
    OR EXISTS (
      SELECT 1
      FROM public.rbac_user_role_assignments a
      JOIN public.rbac_roles r ON r.id = a.role_id
      WHERE a.user_id = _user AND a.organization_id = _org
        AND a.is_active = true AND r.is_active = true
        AND (
          r.data_scope = 'organization'
          OR (r.data_scope = 'program' AND EXISTS (
                SELECT 1 FROM public.beneficiary_services bs
                LEFT JOIN public.projects pj ON pj.id = bs.project_id
                WHERE bs.beneficiary_id = _b AND bs.organization_id = _org
                  AND COALESCE(bs.program_id, pj.program_id) IN (SELECT public.user_assigned_program_ids(_user, _org))))
          OR (r.data_scope IN ('project','assigned') AND EXISTS (
                SELECT 1 FROM public.beneficiary_services bs
                WHERE bs.beneficiary_id = _b AND bs.organization_id = _org
                  AND bs.project_id IN (SELECT public.user_assigned_project_ids(_user, _org))))
          OR EXISTS (SELECT 1 FROM public.beneficiaries b
                     WHERE b.id = _b AND b.organization_id = _org AND b.created_by = _user)
        )
    )
  )
$$;
REVOKE ALL ON FUNCTION public.effective_beneficiary_visibility(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_beneficiary_visibility(uuid, uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.effective_household_visibility(_user uuid, _h uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND _user = auth.uid() AND (
    public.user_is_org_elevated(_user, _org)
    OR EXISTS (
      SELECT 1 FROM public.rbac_user_role_assignments a
      JOIN public.rbac_roles r ON r.id = a.role_id
      WHERE a.user_id = _user AND a.organization_id = _org
        AND a.is_active = true AND r.is_active = true AND r.data_scope = 'organization')
    OR EXISTS (
      SELECT 1 FROM public.beneficiaries b
      WHERE b.household_id = _h AND b.organization_id = _org
        AND public.effective_beneficiary_visibility(_user, b.id, _org))
  )
$$;
REVOKE ALL ON FUNCTION public.effective_household_visibility(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_household_visibility(uuid, uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Org members view beneficiaries with role scoping" ON public.beneficiaries;
DROP POLICY IF EXISTS "Org members update beneficiaries with role scoping" ON public.beneficiaries;
DROP POLICY IF EXISTS "Org members delete beneficiaries with role scoping" ON public.beneficiaries;
CREATE POLICY "Org members view beneficiaries by role scope" ON public.beneficiaries FOR SELECT TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id) AND effective_beneficiary_visibility(auth.uid(), id, organization_id));
CREATE POLICY "Org members update beneficiaries by role scope" ON public.beneficiaries FOR UPDATE TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id) AND effective_beneficiary_visibility(auth.uid(), id, organization_id))
  WITH CHECK (user_belongs_to_org(auth.uid(), organization_id) AND effective_beneficiary_visibility(auth.uid(), id, organization_id));
CREATE POLICY "Org members delete beneficiaries by role scope" ON public.beneficiaries FOR DELETE TO authenticated
  USING (user_belongs_to_org(auth.uid(), organization_id) AND effective_beneficiary_visibility(auth.uid(), id, organization_id));

DROP POLICY IF EXISTS "Org members view households with role scoping" ON public.households;
DROP POLICY IF EXISTS "Org members update households with role scoping" ON public.households;
DROP POLICY IF EXISTS "Org members delete households with role scoping" ON public.households;
CREATE POLICY "Org members view households by role scope" ON public.households FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR (user_belongs_to_org(auth.uid(), organization_id) AND effective_household_visibility(auth.uid(), id, organization_id)));
CREATE POLICY "Org members update households by role scope" ON public.households FOR UPDATE TO authenticated
  USING (is_super_admin(auth.uid()) OR (user_belongs_to_org(auth.uid(), organization_id) AND effective_household_visibility(auth.uid(), id, organization_id)))
  WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org members delete households by role scope" ON public.households FOR DELETE TO authenticated
  USING (is_super_admin(auth.uid()) OR (user_belongs_to_org(auth.uid(), organization_id) AND effective_household_visibility(auth.uid(), id, organization_id)));

-- household_visible_scoped no longer referenced by any policy or function.
DROP FUNCTION IF EXISTS public.household_visible_scoped(uuid, uuid, uuid);

NOTIFY pgrst, 'reload schema';