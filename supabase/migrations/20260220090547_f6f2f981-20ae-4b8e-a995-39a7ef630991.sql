-- Fix: Allow new users to register organizations via a SECURITY DEFINER function
-- that bypasses RLS safely, since the INSERT policy currently restricts to super admins only.

CREATE OR REPLACE FUNCTION public.register_organization(
  _org_name text,
  _org_slug text,
  _org_type text,
  _description text DEFAULT NULL,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _website text DEFAULT NULL,
  _address text DEFAULT NULL,
  _country text DEFAULT NULL,
  _county text DEFAULT NULL,
  _registration_number text DEFAULT NULL,
  _subscription_tier text DEFAULT 'free',
  _features_enabled jsonb DEFAULT '{}'::jsonb,
  _admin_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_org_id uuid;
  _user_id uuid;
BEGIN
  -- Use the provided user_id or fall back to the calling user
  _user_id := COALESCE(_admin_user_id, auth.uid());
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to register an organization';
  END IF;

  -- Check slug uniqueness
  IF EXISTS (SELECT 1 FROM organizations WHERE slug = _org_slug) THEN
    RAISE EXCEPTION 'slug_taken: Organization URL "%" is already taken', _org_slug;
  END IF;

  -- Insert the organization (bypasses RLS via SECURITY DEFINER)
  INSERT INTO public.organizations (
    name, slug, organization_type, description, email, phone, website,
    address, country, county, registration_number,
    subscription_tier, subscription_status, is_active,
    features_enabled, onboarding_completed, onboarding_completed_at
  ) VALUES (
    _org_name, _org_slug, _org_type, _description, _email, _phone, _website,
    _address, _country, _county, _registration_number,
    _subscription_tier, 'active', true,
    _features_enabled, true, now()
  )
  RETURNING id INTO _new_org_id;

  -- Add user as admin member
  INSERT INTO public.organization_members (user_id, organization_id, role, is_primary)
  VALUES (_user_id, _new_org_id, 'admin', true)
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'admin';

  -- Update profile
  UPDATE public.profiles
  SET organization_id = _new_org_id, role = 'admin'
  WHERE user_id = _user_id;

  -- Seed default RBAC roles
  BEGIN
    PERFORM public.seed_default_org_roles(_new_org_id, _user_id);
  EXCEPTION WHEN OTHERS THEN
    -- Non-fatal
    NULL;
  END;

  RETURN jsonb_build_object('id', _new_org_id, 'slug', _org_slug);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.register_organization TO authenticated;

-- Also allow anon to call it (for users who just signed up and may not have a confirmed session yet)
GRANT EXECUTE ON FUNCTION public.register_organization TO anon;
