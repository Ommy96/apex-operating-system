
-- Add Brian Omari to organization_members
INSERT INTO public.organization_members (user_id, organization_id, role, is_primary)
VALUES ('8a0d2b5f-0673-46be-bb2c-c05fd1861c44', 'a0000000-0000-0000-0000-000000000001', 'member', true)
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Clear stale organization_id from profiles that were never properly added as members
UPDATE public.profiles
SET organization_id = NULL
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001'
  AND user_id NOT IN (
    SELECT user_id FROM public.organization_members
    WHERE organization_id = 'a0000000-0000-0000-0000-000000000001'
  );

-- Remove stale RBAC role assignments for those users
DELETE FROM public.rbac_user_role_assignments
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001'
  AND user_id NOT IN (
    SELECT user_id FROM public.organization_members
    WHERE organization_id = 'a0000000-0000-0000-0000-000000000001'
  );
