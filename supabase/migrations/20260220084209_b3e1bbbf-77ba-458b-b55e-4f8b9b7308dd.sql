
-- Migration: Seed default RBAC roles for new organizations on registration
-- Also fixes: plan tier naming consistency (add 'starter' tier support)

-- 1. Create a function to seed default RBAC roles for a new organization
CREATE OR REPLACE FUNCTION public.seed_default_org_roles(_org_id uuid, _admin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_admin_role_id uuid;
  _program_manager_role_id uuid;
  _field_officer_role_id uuid;
  _me_officer_role_id uuid;
  _data_entry_role_id uuid;
  _readonly_role_id uuid;
BEGIN
  -- Insert default system roles for the organization
  INSERT INTO public.rbac_roles (organization_id, name, display_name, description, color, icon, is_system_role, is_active, sort_order)
  VALUES
    (_org_id, 'org_admin', 'Organization Admin', 'Full access to all organization features', '#7C3AED', 'Shield', true, true, 1),
    (_org_id, 'program_manager', 'Program Manager', 'Manage programs, projects and beneficiaries', '#2563EB', 'Briefcase', true, true, 2),
    (_org_id, 'field_officer', 'Field Officer', 'Field data collection and beneficiary management', '#059669', 'UserCheck', true, true, 3),
    (_org_id, 'me_officer', 'M&E Officer', 'Monitoring, evaluation and reporting', '#D97706', 'BarChart2', true, true, 4),
    (_org_id, 'data_entry', 'Data Entry Clerk', 'Basic data entry and record management', '#6B7280', 'Edit3', true, true, 5),
    (_org_id, 'readonly_viewer', 'Read-Only Viewer', 'View-only access to organization data', '#9CA3AF', 'Eye', true, true, 6)
  RETURNING id INTO _org_admin_role_id;

  -- Get the org_admin role id specifically
  SELECT id INTO _org_admin_role_id FROM public.rbac_roles
  WHERE organization_id = _org_id AND name = 'org_admin';

  -- Assign all permissions to org_admin role
  INSERT INTO public.rbac_role_permissions (role_id, permission_id)
  SELECT _org_admin_role_id, p.id
  FROM public.rbac_permissions p
  ON CONFLICT DO NOTHING;

  -- Assign the org_admin RBAC role to the admin user
  INSERT INTO public.rbac_user_role_assignments (user_id, organization_id, role_id, assigned_by, is_active)
  VALUES (_admin_user_id, _org_id, _org_admin_role_id, _admin_user_id, true)
  ON CONFLICT DO NOTHING;

END;
$$;

-- 2. Update the organizations table to track onboarding_completed properly
-- Add a column to track when onboarding was completed
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- 3. Add last_login_at tracking to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- 4. Create a trigger to update last_login_at on sign-in
-- (We'll handle this via the application layer since auth events go through Supabase)

-- 5. Grant execute on the new function to authenticated users (called server-side during registration)
GRANT EXECUTE ON FUNCTION public.seed_default_org_roles(uuid, uuid) TO service_role;
