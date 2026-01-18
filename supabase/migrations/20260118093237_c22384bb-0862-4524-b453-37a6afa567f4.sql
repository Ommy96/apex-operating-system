-- Phase 4: Migrate existing users to organization_members and update user creation trigger

-- Step 1: Migrate all existing users from profiles to organization_members
-- Using Heart to Heart Organization as default
INSERT INTO public.organization_members (user_id, organization_id, role, is_primary, joined_at)
SELECT 
  p.user_id,
  p.organization_id,
  CASE 
    WHEN p.role = 'admin' THEN 'admin'
    WHEN p.role = 'management' THEN 'admin'
    ELSE 'member'
  END,
  true,
  p.created_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om 
  WHERE om.user_id = p.user_id AND om.organization_id = p.organization_id
);

-- Step 2: Update handle_new_user function to also add user to organization_members
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  default_org_id uuid := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email, role, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'staff',
    default_org_id
  );
  
  -- Add user to organization_members
  INSERT INTO public.organization_members (user_id, organization_id, role, is_primary)
  VALUES (
    NEW.id,
    default_org_id,
    'member',
    true
  );
  
  -- Add default staff role to user_roles
  INSERT INTO public.user_roles (user_id, role, granted_at)
  VALUES (
    NEW.id,
    'staff',
    now()
  );
  
  RETURN NEW;
END;
$function$;

-- Step 3: Create function to get user's current organization
CREATE OR REPLACE FUNCTION public.get_user_current_organization(_user_id uuid)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  user_role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.slug as organization_slug,
    om.role as user_role
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = _user_id 
  AND om.is_primary = true
  LIMIT 1;
$$;

-- Step 4: Create function to switch user's primary organization
CREATE OR REPLACE FUNCTION public.switch_user_organization(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify user belongs to the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = _user_id AND organization_id = _org_id
  ) THEN
    RETURN false;
  END IF;
  
  -- Set all orgs as non-primary for this user
  UPDATE public.organization_members 
  SET is_primary = false 
  WHERE user_id = _user_id;
  
  -- Set the target org as primary
  UPDATE public.organization_members 
  SET is_primary = true 
  WHERE user_id = _user_id AND organization_id = _org_id;
  
  RETURN true;
END;
$$;