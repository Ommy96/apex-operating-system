
-- ============================================================
-- RBAC SYSTEM: Full Role-Based Access Control
-- ============================================================

-- 1. Create new RBAC tables
-- ============================================================

-- Roles table (system-wide + org-specific custom roles)
CREATE TABLE public.rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_name text NOT NULL,
  description text,
  is_system_role boolean DEFAULT false,
  is_active boolean DEFAULT true,
  color text DEFAULT '#6366f1',
  icon text DEFAULT 'Shield',
  cloned_from uuid REFERENCES public.rbac_roles(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Permissions catalog (all possible permissions)
CREATE TABLE public.rbac_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  module_display_name text NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  display_name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, action, resource)
);

-- Role-Permission mapping
CREATE TABLE public.rbac_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES public.rbac_roles(id) ON DELETE CASCADE NOT NULL,
  permission_id uuid REFERENCES public.rbac_permissions(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- User-Role assignments (per organization)
CREATE TABLE public.rbac_user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES public.rbac_roles(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(user_id, role_id, organization_id)
);

-- Indexes
CREATE INDEX idx_rbac_roles_org ON public.rbac_roles(organization_id);
CREATE INDEX idx_rbac_roles_system ON public.rbac_roles(is_system_role) WHERE is_system_role = true;
CREATE INDEX idx_rbac_role_permissions_role ON public.rbac_role_permissions(role_id);
CREATE INDEX idx_rbac_role_permissions_perm ON public.rbac_role_permissions(permission_id);
CREATE INDEX idx_rbac_user_assignments_user ON public.rbac_user_role_assignments(user_id);
CREATE INDEX idx_rbac_user_assignments_org ON public.rbac_user_role_assignments(organization_id);
CREATE INDEX idx_rbac_user_assignments_user_org ON public.rbac_user_role_assignments(user_id, organization_id) WHERE is_active = true;

-- 2. Enable RLS on all tables
-- ============================================================
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Permissions table is read-only for all authenticated users
CREATE POLICY "Authenticated users can view permissions"
  ON public.rbac_permissions FOR SELECT TO authenticated USING (true);

-- Roles: users can see system roles + their org roles
CREATE POLICY "Users can view system and own org roles"
  ON public.rbac_roles FOR SELECT TO authenticated
  USING (
    is_system_role = true
    OR organization_id IS NULL
    OR public.user_belongs_to_org(auth.uid(), organization_id)
  );

-- Only org admins can manage roles
CREATE POLICY "Org admins can create roles"
  ON public.rbac_roles FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
    AND public.user_belongs_to_org(auth.uid(), organization_id)
  );

CREATE POLICY "Org admins can update roles"
  ON public.rbac_roles FOR UPDATE TO authenticated
  USING (
    organization_id IS NOT NULL
    AND is_system_role = false
    AND public.user_belongs_to_org(auth.uid(), organization_id)
  );

CREATE POLICY "Org admins can delete custom roles"
  ON public.rbac_roles FOR DELETE TO authenticated
  USING (
    is_system_role = false
    AND organization_id IS NOT NULL
    AND public.user_belongs_to_org(auth.uid(), organization_id)
  );

-- Role permissions: visible if role is visible
CREATE POLICY "Users can view role permissions"
  ON public.rbac_role_permissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rbac_roles r
      WHERE r.id = role_id
      AND (r.is_system_role = true OR r.organization_id IS NULL OR public.user_belongs_to_org(auth.uid(), r.organization_id))
    )
  );

CREATE POLICY "Org admins can manage role permissions"
  ON public.rbac_role_permissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rbac_roles r
      WHERE r.id = role_id
      AND r.organization_id IS NOT NULL
      AND public.user_belongs_to_org(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Org admins can delete role permissions"
  ON public.rbac_role_permissions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rbac_roles r
      WHERE r.id = role_id
      AND r.is_system_role = false
      AND r.organization_id IS NOT NULL
      AND public.user_belongs_to_org(auth.uid(), r.organization_id)
    )
  );

-- User role assignments: visible within own org
CREATE POLICY "Users can view role assignments in their org"
  ON public.rbac_user_role_assignments FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can assign roles"
  ON public.rbac_user_role_assignments FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can update role assignments"
  ON public.rbac_user_role_assignments FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can remove role assignments"
  ON public.rbac_user_role_assignments FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- 3. Seed all permissions
-- ============================================================
INSERT INTO public.rbac_permissions (module, module_display_name, action, resource, display_name, description, sort_order) VALUES
-- Beneficiary Module (sort 100-199)
('beneficiaries', 'Beneficiaries', 'view', 'beneficiaries', 'View Beneficiaries', 'View beneficiary records', 100),
('beneficiaries', 'Beneficiaries', 'create', 'beneficiaries', 'Create Beneficiaries', 'Register new beneficiaries', 101),
('beneficiaries', 'Beneficiaries', 'edit', 'beneficiaries', 'Edit Beneficiaries', 'Update beneficiary information', 102),
('beneficiaries', 'Beneficiaries', 'delete', 'beneficiaries', 'Delete Beneficiaries', 'Remove beneficiary records', 103),
('beneficiaries', 'Beneficiaries', 'view', 'medical_info', 'View Medical Info', 'Access sensitive medical information', 104),
('beneficiaries', 'Beneficiaries', 'manage', 'documents', 'Upload Documents', 'Upload beneficiary documents', 105),
('beneficiaries', 'Beneficiaries', 'manage', 'enrollment', 'Manage Enrollment', 'Manage program service enrollment', 106),
('beneficiaries', 'Beneficiaries', 'export', 'beneficiaries', 'Export Beneficiaries', 'Export beneficiary data', 107),

-- Programs & Projects (sort 200-299)
('programs', 'Programs & Projects', 'view', 'programs', 'View Programs', 'View programs list', 200),
('programs', 'Programs & Projects', 'create', 'programs', 'Create Programs', 'Create new programs', 201),
('programs', 'Programs & Projects', 'edit', 'programs', 'Edit Programs', 'Update program details', 202),
('programs', 'Programs & Projects', 'delete', 'programs', 'Delete Programs', 'Remove programs', 203),
('programs', 'Programs & Projects', 'create', 'projects', 'Create Projects', 'Create projects within programs', 204),
('programs', 'Programs & Projects', 'edit', 'projects', 'Edit Projects', 'Update project details', 205),
('programs', 'Programs & Projects', 'delete', 'projects', 'Delete Projects', 'Remove projects', 206),
('programs', 'Programs & Projects', 'manage', 'activities', 'Manage Activities', 'Create and manage program activities', 207),
('programs', 'Programs & Projects', 'manage', 'staff_assignment', 'Assign Staff', 'Assign staff to programs', 208),
('programs', 'Programs & Projects', 'manage', 'indicators', 'Manage Indicators', 'Configure program indicators', 209),

-- Visitations & Observations (sort 300-399)
('visitations', 'Visitations & Observations', 'view', 'visits', 'View Visits', 'View visitation records', 300),
('visitations', 'Visitations & Observations', 'create', 'visits', 'Create Visits', 'Record new visits', 301),
('visitations', 'Visitations & Observations', 'edit', 'visits', 'Edit Visits', 'Update visit records', 302),
('visitations', 'Visitations & Observations', 'delete', 'visits', 'Delete Visits', 'Remove visit records', 303),
('visitations', 'Visitations & Observations', 'manage', 'observations', 'Record Observations', 'Record observations during visits', 304),
('visitations', 'Visitations & Observations', 'manage', 'follow_ups', 'Assign Follow-ups', 'Assign follow-up actions', 305),

-- Reports & Analytics (sort 400-499)
('reports', 'Reports & Analytics', 'view', 'reports', 'View Reports', 'View reports and dashboards', 400),
('reports', 'Reports & Analytics', 'create', 'reports', 'Generate Reports', 'Generate custom reports', 401),
('reports', 'Reports & Analytics', 'export', 'reports', 'Export Reports', 'Export reports as PDF/Excel', 402),
('reports', 'Reports & Analytics', 'view', 'financial_data', 'View Financial Data', 'Access financial reports', 403),
('reports', 'Reports & Analytics', 'view', 'donor_reports', 'Access Donor Reports', 'View donor-specific reports', 404),
('reports', 'Reports & Analytics', 'view', 'analytics', 'View Analytics', 'Access analytics dashboards', 405),

-- Donors (sort 500-599)
('donors', 'Donor Management', 'view', 'donors', 'View Donors', 'View donor records', 500),
('donors', 'Donor Management', 'create', 'donors', 'Create Donors', 'Add new donors', 501),
('donors', 'Donor Management', 'edit', 'donors', 'Edit Donors', 'Update donor contributions', 502),
('donors', 'Donor Management', 'manage', 'program_links', 'Link Donors to Programs', 'Assign donors to programs', 503),

-- User & Role Administration (sort 600-699)
('users', 'User Administration', 'view', 'users', 'View Users', 'View staff/user list', 600),
('users', 'User Administration', 'create', 'users', 'Create Users', 'Invite new users', 601),
('users', 'User Administration', 'edit', 'users', 'Edit Users', 'Update user information', 602),
('users', 'User Administration', 'manage', 'suspend', 'Suspend Users', 'Suspend/activate users', 603),
('users', 'User Administration', 'manage', 'roles', 'Assign Roles', 'Assign roles to users', 604),
('users', 'User Administration', 'manage', 'custom_roles', 'Manage Custom Roles', 'Create and edit custom roles', 605),

-- System Configuration (sort 700-799)
('settings', 'System Configuration', 'manage', 'org_settings', 'Organization Settings', 'Configure organization settings', 700),
('settings', 'System Configuration', 'manage', 'program_templates', 'Program Templates', 'Manage program templates', 701),
('settings', 'System Configuration', 'manage', 'indicator_templates', 'Indicator Templates', 'Manage indicator templates', 702),
('settings', 'System Configuration', 'manage', 'branding', 'Branding Customization', 'Customize branding', 703),

-- Attendance (sort 800-899)
('attendance', 'Attendance', 'view', 'attendance', 'View Attendance', 'View attendance records', 800),
('attendance', 'Attendance', 'create', 'attendance', 'Record Attendance', 'Record attendance', 801),
('attendance', 'Attendance', 'edit', 'attendance', 'Edit Attendance', 'Update attendance records', 802),
('attendance', 'Attendance', 'export', 'attendance', 'Export Attendance', 'Export attendance data', 803);

-- 4. Seed default system roles
-- ============================================================
DO $$
DECLARE
  role_super_admin uuid;
  role_org_admin uuid;
  role_program_manager uuid;
  role_field_officer uuid;
  role_me_officer uuid;
  role_data_entry uuid;
  role_viewer uuid;
BEGIN
  -- Create system roles
  INSERT INTO public.rbac_roles (name, display_name, description, is_system_role, color, icon)
  VALUES ('super_admin', 'Super Admin', 'Full system access across all organizations', true, '#dc2626', 'ShieldAlert')
  RETURNING id INTO role_super_admin;

  INSERT INTO public.rbac_roles (name, display_name, description, is_system_role, color, icon)
  VALUES ('org_admin', 'Organization Admin', 'Full access within their organization', true, '#7c3aed', 'ShieldCheck')
  RETURNING id INTO role_org_admin;

  INSERT INTO public.rbac_roles (name, display_name, description, is_system_role, color, icon)
  VALUES ('program_manager', 'Program Manager', 'Manage programs, projects, and linked beneficiaries', true, '#2563eb', 'Briefcase')
  RETURNING id INTO role_program_manager;

  INSERT INTO public.rbac_roles (name, display_name, description, is_system_role, color, icon)
  VALUES ('field_officer', 'Field Officer', 'Register beneficiaries, record visits, update service delivery', true, '#16a34a', 'UserCheck')
  RETURNING id INTO role_field_officer;

  INSERT INTO public.rbac_roles (name, display_name, description, is_system_role, color, icon)
  VALUES ('me_officer', 'M&E Officer', 'Monitoring & Evaluation - analytics, indicators, reports', true, '#ea580c', 'BarChart3')
  RETURNING id INTO role_me_officer;

  INSERT INTO public.rbac_roles (name, display_name, description, is_system_role, color, icon)
  VALUES ('data_entry', 'Data Entry Clerk', 'Create and edit beneficiary records and upload documents', true, '#0891b2', 'PenLine')
  RETURNING id INTO role_data_entry;

  INSERT INTO public.rbac_roles (name, display_name, description, is_system_role, color, icon)
  VALUES ('viewer', 'Read-Only Viewer', 'View reports and dashboards, no editing rights', true, '#64748b', 'Eye')
  RETURNING id INTO role_viewer;

  -- Super Admin: ALL permissions
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT role_super_admin, id FROM public.rbac_permissions;

  -- Org Admin: ALL permissions
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT role_org_admin, id FROM public.rbac_permissions;

  -- Program Manager
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT role_program_manager, id FROM public.rbac_permissions
  WHERE (module = 'beneficiaries' AND action IN ('view', 'create', 'edit', 'manage', 'export'))
     OR (module = 'programs')
     OR (module = 'visitations')
     OR (module = 'reports' AND action IN ('view', 'create', 'export'))
     OR (module = 'donors' AND action = 'view')
     OR (module = 'attendance')
     OR (module = 'users' AND action = 'view');

  -- Field Officer
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT role_field_officer, id FROM public.rbac_permissions
  WHERE (module = 'beneficiaries' AND action IN ('view', 'create', 'edit', 'manage'))
     OR (module = 'programs' AND action = 'view')
     OR (module = 'programs' AND action = 'manage' AND resource = 'activities')
     OR (module = 'visitations' AND action IN ('view', 'create', 'edit', 'manage'))
     OR (module = 'attendance' AND action IN ('view', 'create', 'edit'));

  -- M&E Officer
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT role_me_officer, id FROM public.rbac_permissions
  WHERE (module = 'beneficiaries' AND action IN ('view', 'export'))
     OR (module = 'programs' AND action IN ('view', 'manage') AND resource IN ('programs', 'indicators'))
     OR (module = 'visitations' AND action = 'view')
     OR (module = 'reports')
     OR (module = 'donors' AND action = 'view')
     OR (module = 'attendance' AND action IN ('view', 'export'));

  -- Data Entry Clerk
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT role_data_entry, id FROM public.rbac_permissions
  WHERE (module = 'beneficiaries' AND action IN ('view', 'create', 'edit', 'manage') AND resource != 'medical_info')
     OR (module = 'attendance' AND action IN ('view', 'create', 'edit'));

  -- Read-Only Viewer
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT role_viewer, id FROM public.rbac_permissions
  WHERE action = 'view'
    AND module IN ('beneficiaries', 'programs', 'reports', 'attendance')
    AND resource NOT IN ('medical_info', 'financial_data');
END $$;

-- 5. Create security definer functions
-- ============================================================

-- Check if user has a specific permission in an org
CREATE OR REPLACE FUNCTION public.user_has_permission(
  _user_id uuid,
  _org_id uuid,
  _module text,
  _action text,
  _resource text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rbac_user_role_assignments ura
    JOIN public.rbac_role_permissions rp ON rp.role_id = ura.role_id
    JOIN public.rbac_permissions p ON p.id = rp.permission_id
    WHERE ura.user_id = _user_id
      AND ura.organization_id = _org_id
      AND ura.is_active = true
      AND p.module = _module
      AND p.action = _action
      AND p.resource = _resource
  );
$$;

-- Get all permission keys for a user in an org (returns array of 'module.action.resource')
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  _user_id uuid,
  _org_id uuid
)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(array_agg(DISTINCT p.module || '.' || p.action || '.' || p.resource), ARRAY[]::text[])
  FROM public.rbac_user_role_assignments ura
  JOIN public.rbac_role_permissions rp ON rp.role_id = ura.role_id
  JOIN public.rbac_permissions p ON p.id = rp.permission_id
  WHERE ura.user_id = _user_id
    AND ura.organization_id = _org_id
    AND ura.is_active = true;
$$;

-- Get user's role display names in an org
CREATE OR REPLACE FUNCTION public.get_user_rbac_roles(
  _user_id uuid,
  _org_id uuid
)
RETURNS TABLE(role_id uuid, role_name text, display_name text, color text, icon text, is_system_role boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT r.id, r.name, r.display_name, r.color, r.icon, r.is_system_role
  FROM public.rbac_user_role_assignments ura
  JOIN public.rbac_roles r ON r.id = ura.role_id
  WHERE ura.user_id = _user_id
    AND ura.organization_id = _org_id
    AND ura.is_active = true
    AND r.is_active = true;
$$;

-- 6. Migrate existing users from old role system
-- ============================================================
DO $$
DECLARE
  r record;
  target_role_name text;
  target_role_id uuid;
BEGIN
  FOR r IN
    SELECT om.user_id, om.organization_id, om.role as org_role, ur.role as user_role
    FROM public.organization_members om
    LEFT JOIN public.user_roles ur ON ur.user_id = om.user_id
  LOOP
    -- Map old roles to new ones
    CASE COALESCE(r.user_role::text, r.org_role)
      WHEN 'admin' THEN target_role_name := 'org_admin';
      WHEN 'management' THEN target_role_name := 'program_manager';
      WHEN 'staff' THEN target_role_name := 'field_officer';
      ELSE target_role_name := 'field_officer';
    END CASE;

    SELECT id INTO target_role_id FROM public.rbac_roles WHERE name = target_role_name AND is_system_role = true LIMIT 1;

    IF target_role_id IS NOT NULL THEN
      INSERT INTO public.rbac_user_role_assignments (user_id, role_id, organization_id, is_active)
      VALUES (r.user_id, target_role_id, r.organization_id, true)
      ON CONFLICT (user_id, role_id, organization_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- 7. Audit trigger for RBAC changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_rbac_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, new_values, metadata)
    VALUES (TG_TABLE_NAME || '_created', TG_TABLE_NAME, NEW.id, auth.uid(), to_jsonb(NEW),
            jsonb_build_object('operation', TG_OP, 'table', TG_TABLE_NAME));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, old_values, new_values, metadata)
    VALUES (TG_TABLE_NAME || '_updated', TG_TABLE_NAME, NEW.id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW),
            jsonb_build_object('operation', TG_OP, 'table', TG_TABLE_NAME));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (event_type, entity_type, entity_id, user_id, old_values, metadata)
    VALUES (TG_TABLE_NAME || '_deleted', TG_TABLE_NAME, OLD.id, auth.uid(), to_jsonb(OLD),
            jsonb_build_object('operation', TG_OP, 'table', TG_TABLE_NAME));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_rbac_role_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.rbac_user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_changes();

CREATE TRIGGER audit_rbac_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.rbac_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_changes();

CREATE TRIGGER audit_rbac_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.rbac_role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_rbac_changes();

-- Updated_at triggers
CREATE TRIGGER update_rbac_roles_updated_at
  BEFORE UPDATE ON public.rbac_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
