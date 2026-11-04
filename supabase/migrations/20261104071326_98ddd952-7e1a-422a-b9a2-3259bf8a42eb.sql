-- ============================================================
-- Permission system gap closure (audit 2026-11-02)
-- Preserves existing roles, catalogue and list_org_staff RPC.
-- ============================================================

-- 1. New catalogue permissions -------------------------------
INSERT INTO public.rbac_permissions (module, module_display_name, action, resource, display_name, description, sort_order)
VALUES
  ('programs', 'Programs', 'aggregate', 'programs', 'Aggregate programme totals', 'View suppressed aggregate-only totals for programmes outside assigned scope', 900)
ON CONFLICT (module, action, resource) DO NOTHING;

-- 2. Missing Phase 5.2 system roles, seeded for every existing org
INSERT INTO public.rbac_roles (organization_id, name, display_name, description, color, icon, is_system_role, is_active)
SELECT o.id, v.name, v.display_name, v.description, v.color, v.icon, true, true
FROM public.organizations o
CROSS JOIN (VALUES
  ('project_manager', 'Project Manager', 'Manage assigned projects, activities and project teams', '#0EA5E9', 'FolderKanban'),
  ('staff_member',    'Staff Member',    'Operational staff workspace for assigned beneficiaries and work', '#6366F1', 'Users')
) AS v(name, display_name, description, color, icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.rbac_roles r
  WHERE r.organization_id = o.id AND r.name = v.name
);

-- 3. Role -> permission mappings -----------------------------
-- Project Manager: everything in programs/ME/reports plus beneficiary and document views, without deletes.
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
CROSS JOIN public.rbac_permissions p
WHERE r.is_system_role AND r.is_active AND r.name = 'project_manager'
  AND p.module NOT IN ('users', 'settings')
  AND p.action <> 'delete'
ON CONFLICT DO NOTHING;

-- Staff Member: capture-and-operate on assigned work only (scoping enforced in RLS).
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
CROSS JOIN public.rbac_permissions p
WHERE r.is_system_role AND r.is_active AND r.name = 'staff_member'
  AND (
       (p.module = 'beneficiaries' AND p.action IN ('view','create','edit') AND p.resource <> 'medical_info')
    OR (p.module IN ('visitations','attendance','documents') AND p.action IN ('view','create','edit'))
    OR (p.module = 'programs' AND p.action = 'view')
    OR (p.module = 'me' AND p.action = 'view')
  )
ON CONFLICT DO NOTHING;

-- org_admin and program_manager get the new aggregate permission.
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
JOIN public.rbac_permissions p
  ON p.module = 'programs' AND p.action = 'aggregate' AND p.resource = 'programs'
WHERE r.is_system_role AND r.name IN ('org_admin', 'program_manager')
ON CONFLICT DO NOTHING;

-- 4. Extend role seeding for future organisations ------------
CREATE OR REPLACE FUNCTION public.seed_default_org_roles(_org_id uuid, _admin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _org_admin_role_id uuid;
  _pm_id uuid; _me_id uuid; _fo_id uuid; _de_id uuid; _ro_id uuid;
  _projm_id uuid; _staff_id uuid;
BEGIN
  INSERT INTO public.rbac_roles (organization_id, name, display_name, description, color, icon, is_system_role, is_active)
  VALUES
    (_org_id, 'org_admin',       'Organization Admin', 'Full access to all organization features', '#7C3AED', 'Shield',    true, true),
    (_org_id, 'program_manager', 'Program Manager',    'Manage programs, projects and beneficiaries', '#2563EB', 'Briefcase', true, true),
    (_org_id, 'project_manager', 'Project Manager',    'Manage assigned projects, activities and project teams', '#0EA5E9', 'FolderKanban', true, true),
    (_org_id, 'staff_member',    'Staff Member',       'Operational staff workspace for assigned beneficiaries and work', '#6366F1', 'Users', true, true),
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
  SELECT id INTO _projm_id          FROM public.rbac_roles WHERE organization_id = _org_id AND name = 'project_manager';
  SELECT id INTO _staff_id          FROM public.rbac_roles WHERE organization_id = _org_id AND name = 'staff_member';

  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _org_admin_role_id, p.id FROM public.rbac_permissions p
  ON CONFLICT DO NOTHING;

  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _pm_id, p.id FROM public.rbac_permissions p
  WHERE p.module NOT IN ('users','settings')
  ON CONFLICT DO NOTHING;

  -- Project Manager: programs/ME/reports without deletes.
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _projm_id, p.id FROM public.rbac_permissions p
  WHERE p.module NOT IN ('users','settings') AND p.action <> 'delete'
  ON CONFLICT DO NOTHING;

  -- Staff Member: operate on assigned work, no deletes/exports/approvals.
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _staff_id, p.id FROM public.rbac_permissions p
  WHERE (
       (p.module = 'beneficiaries' AND p.action IN ('view','create','edit') AND p.resource <> 'medical_info')
    OR (p.module IN ('visitations','attendance','documents') AND p.action IN ('view','create','edit'))
    OR (p.module = 'programs' AND p.action = 'view')
    OR (p.module = 'me' AND p.action = 'view')
  )
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

-- 5. Server-side scoping helpers -----------------------------
CREATE OR REPLACE FUNCTION public.user_is_org_elevated(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = _user_id AND om.organization_id = _org_id
      AND om.role IN ('owner','admin','org_admin','management','manager')
  ) OR public.has_role(_user_id, 'admin'::user_role);
$function$;

CREATE OR REPLACE FUNCTION public.user_has_only_roles(_user_id uuid, _org_id uuid, _role_names text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_user_role_assignments a
    JOIN public.rbac_roles r ON r.id = a.role_id
    WHERE a.user_id = _user_id AND a.organization_id = _org_id
      AND a.is_active = true AND r.is_active = true
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.rbac_user_role_assignments a
    JOIN public.rbac_roles r ON r.id = a.role_id
    WHERE a.user_id = _user_id AND a.organization_id = _org_id
      AND a.is_active = true AND r.is_active = true
      AND NOT (r.name = ANY(_role_names))
  );
$function$;

-- Program Manager with no broader elevation: full detail only inside assigned programmes.
CREATE OR REPLACE FUNCTION public.user_is_program_scoped(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
  SELECT NOT public.user_is_org_elevated(_user_id, _org_id)
    AND public.user_has_only_roles(_user_id, _org_id, ARRAY['program_manager']);
$function$;

-- Field staff: full detail only for beneficiaries in their assigned projects.
CREATE OR REPLACE FUNCTION public.user_is_field_scoped(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
  SELECT NOT public.user_is_org_elevated(_user_id, _org_id)
    AND public.user_has_only_roles(_user_id, _org_id, ARRAY['field_officer','data_entry','staff_member']);
$function$;

CREATE OR REPLACE FUNCTION public.user_assigned_program_ids(_user_id uuid, _org_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
  SELECT pt.program_id
  FROM public.programme_team pt
  WHERE pt.org_id = _org_id AND pt.staff_id = _user_id AND pt.end_date IS NULL
  UNION
  SELECT pr.program_id
  FROM public.projects pr
  JOIN public.project_team_members ptm ON ptm.project_id = pr.id
  WHERE pr.organization_id = _org_id AND ptm.user_id = _user_id
    AND (ptm.end_date IS NULL OR ptm.end_date >= CURRENT_DATE);
$function$;

CREATE OR REPLACE FUNCTION public.user_assigned_project_ids(_user_id uuid, _org_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
  SELECT ptm.project_id
  FROM public.project_team_members ptm
  JOIN public.projects pr ON pr.id = ptm.project_id
  WHERE pr.organization_id = _org_id AND ptm.user_id = _user_id
    AND (ptm.end_date IS NULL OR ptm.end_date >= CURRENT_DATE)
  UNION
  SELECT pt.project_id
  FROM public.programme_team pt
  WHERE pt.org_id = _org_id AND pt.staff_id = _user_id AND pt.end_date IS NULL AND pt.project_id IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION public.beneficiary_visible_scoped(_user_id uuid, _b_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.beneficiary_services bs
    WHERE bs.beneficiary_id = _b_id
      AND bs.organization_id = _org_id
      AND (
        bs.program_id IN (SELECT program_id FROM public.user_assigned_program_ids(_user_id, _org_id))
        OR bs.project_id IN (SELECT project_id FROM public.user_assigned_project_ids(_user_id, _org_id))
      )
  ) OR EXISTS (
    SELECT 1 FROM public.beneficiaries b
    WHERE b.id = _b_id AND b.organization_id = _org_id AND b.created_by = _user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.household_visible_scoped(_user_id uuid, _h_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.beneficiaries b
    WHERE b.household_id = _h_id
      AND b.organization_id = _org_id
      AND public.beneficiary_visible_scoped(_user_id, b.id, _org_id)
  );
$function$;

-- 6. Enforce scoping in RLS (beneficiaries + households) -----
DROP POLICY IF EXISTS "Users can view beneficiaries in their organization" ON public.beneficiaries;
CREATE POLICY "Org members view beneficiaries with role scoping"
ON public.beneficiaries
FOR SELECT TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND (
    NOT (
      public.user_is_program_scoped(auth.uid(), organization_id)
      OR public.user_is_field_scoped(auth.uid(), organization_id)
    )
    OR public.beneficiary_visible_scoped(auth.uid(), id, organization_id)
  )
);

DROP POLICY IF EXISTS "Users can update beneficiaries in their organization" ON public.beneficiaries;
CREATE POLICY "Org members update beneficiaries with role scoping"
ON public.beneficiaries
FOR UPDATE TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND (
    NOT (
      public.user_is_program_scoped(auth.uid(), organization_id)
      OR public.user_is_field_scoped(auth.uid(), organization_id)
    )
    OR public.beneficiary_visible_scoped(auth.uid(), id, organization_id)
  )
)
WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND (
    NOT (
      public.user_is_program_scoped(auth.uid(), organization_id)
      OR public.user_is_field_scoped(auth.uid(), organization_id)
    )
    OR public.beneficiary_visible_scoped(auth.uid(), id, organization_id)
  )
);

DROP POLICY IF EXISTS "Users can delete beneficiaries in their organization" ON public.beneficiaries;
CREATE POLICY "Org members delete beneficiaries with role scoping"
ON public.beneficiaries
FOR DELETE TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND (
    NOT (
      public.user_is_program_scoped(auth.uid(), organization_id)
      OR public.user_is_field_scoped(auth.uid(), organization_id)
    )
    OR public.beneficiary_visible_scoped(auth.uid(), id, organization_id)
  )
);

DROP POLICY IF EXISTS "Org members can view households" ON public.households;
CREATE POLICY "Org members view households with role scoping"
ON public.households
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (
      NOT (
        public.user_is_program_scoped(auth.uid(), organization_id)
        OR public.user_is_field_scoped(auth.uid(), organization_id)
      )
      OR public.household_visible_scoped(auth.uid(), id, organization_id)
    )
  )
);

DROP POLICY IF EXISTS "Org members can update households" ON public.households;
CREATE POLICY "Org members update households with role scoping"
ON public.households
FOR UPDATE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (
      NOT (
        public.user_is_program_scoped(auth.uid(), organization_id)
        OR public.user_is_field_scoped(auth.uid(), organization_id)
      )
      OR public.household_visible_scoped(auth.uid(), id, organization_id)
    )
  )
)
WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id)
);

DROP POLICY IF EXISTS "Org members can delete households" ON public.households;
CREATE POLICY "Org members delete households with role scoping"
ON public.households
FOR DELETE TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (
      NOT (
        public.user_is_program_scoped(auth.uid(), organization_id)
        OR public.user_is_field_scoped(auth.uid(), organization_id)
      )
      OR public.household_visible_scoped(auth.uid(), id, organization_id)
    )
  )
);

-- 7. Aggregate-only access with minimum cell size ------------
CREATE OR REPLACE FUNCTION public.get_program_aggregate(_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  _org uuid;
  _total int;
  _active int;
  _male int;
  _female int;
  _min_cell CONSTANT int := 5;
BEGIN
  SELECT organization_id INTO _org FROM public.programs WHERE id = _program_id;
  IF _org IS NULL THEN
    RAISE EXCEPTION 'Programme not found';
  END IF;
  IF NOT (public.user_belongs_to_org(auth.uid(), _org) OR public.has_role(auth.uid(), 'admin'::user_role)) THEN
    RAISE EXCEPTION 'Not authorised for this organisation';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE bs.status IN ('active','enrolled')),
         count(*) FILTER (WHERE b.gender = 'male'),
         count(*) FILTER (WHERE b.gender = 'female')
  INTO _total, _active, _male, _female
  FROM public.beneficiary_services bs
  JOIN public.beneficiaries b ON b.id = bs.beneficiary_id
  WHERE bs.program_id = _program_id AND b.organization_id = _org;

  RETURN jsonb_build_object(
    'program_id', _program_id,
    'total_beneficiaries', CASE WHEN _total >= _min_cell THEN _total END,
    'active_beneficiaries', CASE WHEN _active >= _min_cell THEN _active END,
    'male', CASE WHEN _male >= _min_cell THEN _male END,
    'female', CASE WHEN _female >= _min_cell THEN _female END,
    'minimum_cell_size', _min_cell
  );
END;
$function$;

-- 8. Assignment revocation for departing staff ---------------
CREATE OR REPLACE FUNCTION public.revoke_staff_access(_org_id uuid, _user_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  _roles int;
  _project_team int;
  _program_team int;
  _approvals int;
  _other_orgs int;
BEGIN
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot revoke your own access';
  END IF;
  IF NOT public.user_is_org_elevated(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'Only organisation admins can revoke staff access';
  END IF;

  -- 1) RBAC role assignments: inactive on the next request.
  UPDATE public.rbac_user_role_assignments
  SET is_active = false
  WHERE user_id = _user_id AND organization_id = _org_id AND is_active = true;
  GET DIAGNOSTICS _roles = ROW_COUNT;

  -- 2) Team assignments end today. Historical rows keep their history.
  UPDATE public.project_team_members ptm
  SET end_date = CURRENT_DATE, updated_at = now()
  WHERE ptm.user_id = _user_id AND ptm.end_date IS NULL
    AND ptm.project_id IN (SELECT id FROM public.projects WHERE organization_id = _org_id);
  GET DIAGNOSTICS _project_team = ROW_COUNT;

  UPDATE public.programme_team pt
  SET end_date = CURRENT_DATE, updated_at = now()
  WHERE pt.staff_id = _user_id AND pt.org_id = _org_id AND pt.end_date IS NULL;
  GET DIAGNOSTICS _program_team = ROW_COUNT;

  -- 3) Open approvals move to the approving admin — but only when this is
  --    the person's only organisation, since approval_requests carries no org column.
  SELECT count(*) INTO _other_orgs
  FROM public.organization_members om
  WHERE om.user_id = _user_id AND om.organization_id <> _org_id;
  IF _other_orgs = 0 THEN
    UPDATE public.approval_requests
    SET approver_id = auth.uid(),
        reviewer_comments = COALESCE(reviewer_comments, '') ||
          CASE WHEN _note IS NOT NULL AND _note <> '' THEN ' | Reassigned: ' || _note ELSE ' | Reassigned after staff access revoked' END,
        updated_at = now()
    WHERE approver_id = _user_id AND status = 'pending';
    GET DIAGNOSTICS _approvals = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'roles_deactivated', _roles,
    'project_assignments_ended', _project_team,
    'program_assignments_ended', _program_team,
    'approvals_reassigned', _approvals
  );
END;
$function$;

-- 9. Function privileges -------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_program_aggregate(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_program_aggregate(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_staff_access(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_staff_access(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_org_elevated(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_only_roles(uuid, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_program_scoped(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_field_scoped(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_assigned_program_ids(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_assigned_project_ids(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.beneficiary_visible_scoped(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.household_visible_scoped(uuid, uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';