
-- ================================================================
-- Phase 2 Continued: Data Exposure Hardening (Corrected)
-- ================================================================

-- ================================================================
-- 1. PROFILES TABLE - restrict email visibility
-- ================================================================
DROP POLICY IF EXISTS "Org members can view profiles in org" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Org admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Org admins can view profiles in their org" ON public.profiles;

-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

-- Org admins/owners/management can view all profiles in their org
CREATE POLICY "Org admins can view profiles in their org"
ON public.profiles FOR SELECT
USING (
  organization_id IS NOT NULL
  AND user_belongs_to_org(auth.uid(), organization_id)
  AND get_org_member_role(auth.uid(), organization_id) = ANY(ARRAY['admin', 'management', 'owner'])
);

-- ================================================================
-- 2. CHILDREN TABLE - security barrier view masking PII
-- ================================================================
CREATE OR REPLACE VIEW public.children_safe_view
WITH (security_barrier = true)
AS
SELECT
  id,
  first_name,
  last_name,
  date_of_birth,
  gender,
  academic_level,
  grade,
  status,
  photo_url,
  enrollment_date,
  organization_id,
  residence,
  parental_status,
  course_name,
  institution_name,
  student_id,
  replacement_status,
  inactive_date,
  inactive_reason,
  receives_hbc,
  receives_shopping,
  receives_transport,
  donor,
  donation_received_ksh,
  address,
  created_at,
  updated_at,
  created_by
  -- Deliberately omitting: medical_notes, special_needs, special_condition,
  -- guardian_name, guardian_phone, guardian_email, relation, contact
FROM public.children
WHERE user_belongs_to_org(auth.uid(), organization_id);

GRANT SELECT ON public.children_safe_view TO authenticated;

-- ================================================================
-- 3. ORGANIZATIONS TABLE - restrict financial/Stripe data
-- ================================================================
DROP POLICY IF EXISTS "Organization members can view their org" ON public.organizations;
DROP POLICY IF EXISTS "Org admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Org members can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Org admins can update organization" ON public.organizations;

-- All org members can view their organization (basic read)
CREATE POLICY "Org members can view their organization"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organizations.id
    AND om.user_id = auth.uid()
  )
);

-- Org admins/owners can update organization
CREATE POLICY "Org admins can update organization"
ON public.organizations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organizations.id
    AND om.user_id = auth.uid()
    AND om.role = ANY(ARRAY['admin', 'owner'])
  )
);

-- Security barrier view for organizations - masks financial data from non-admins
CREATE OR REPLACE VIEW public.organizations_public_view
WITH (security_barrier = true)
AS
SELECT
  id,
  name,
  slug,
  description,
  email,
  phone,
  website,
  address,
  country,
  county,
  organization_type,
  registration_number,
  logo_url,
  is_active,
  onboarding_completed,
  created_at,
  updated_at,
  suspended_at,
  suspended_reason,
  -- Financial fields only for admins/owners
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN stripe_customer_id 
    ELSE NULL 
  END AS stripe_customer_id,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN stripe_subscription_id 
    ELSE NULL 
  END AS stripe_subscription_id,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN subscription_status 
    ELSE NULL 
  END AS subscription_status,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN subscription_tier 
    ELSE NULL 
  END AS subscription_tier,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN subscription_started_at 
    ELSE NULL 
  END AS subscription_started_at,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN subscription_ends_at 
    ELSE NULL 
  END AS subscription_ends_at,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN trial_ends_at 
    ELSE NULL 
  END AS trial_ends_at,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN usage_stats 
    ELSE NULL 
  END AS usage_stats,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN features_enabled 
    ELSE NULL 
  END AS features_enabled,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN settings 
    ELSE NULL 
  END AS settings
FROM public.organizations
WHERE
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organizations.id
    AND om.user_id = auth.uid()
  );

GRANT SELECT ON public.organizations_public_view TO authenticated;

-- ================================================================
-- 4. RBAC PERMISSIONS TABLE
-- rbac_permissions has no organization_id - it's a global permissions catalog.
-- Fix: Restrict to platform admins only (has_role 'admin').
-- Regular users get permissions via get_user_permissions() RPC only.
-- ================================================================
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.rbac_permissions;

-- Only platform admins can browse the full permissions catalog
CREATE POLICY "Platform admins can view rbac permissions"
ON public.rbac_permissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- ================================================================
-- 5. ORGANIZATION INVITATIONS - require authentication for token lookup
-- ================================================================
DROP POLICY IF EXISTS "Anyone can lookup invitation by token" ON public.organization_invitations;

-- Only authenticated users can look up invitations by token
CREATE POLICY "Authenticated users can lookup invitation by token"
ON public.organization_invitations FOR SELECT
USING (auth.uid() IS NOT NULL);
