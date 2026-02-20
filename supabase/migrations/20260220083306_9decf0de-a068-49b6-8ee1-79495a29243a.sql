
-- Fix: Recreate views using security_invoker=true (Supabase recommended approach)
-- This ensures RLS of the CALLING user is applied, not the view creator.

DROP VIEW IF EXISTS public.children_safe_view;
DROP VIEW IF EXISTS public.organizations_public_view;

-- Children safe view (no medical PII, security_invoker respects caller's RLS)
CREATE VIEW public.children_safe_view
WITH (security_invoker = true)
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
  -- Omitted: medical_notes, special_needs, special_condition,
  -- guardian_name, guardian_phone, guardian_email, relation, contact
FROM public.children;

GRANT SELECT ON public.children_safe_view TO authenticated;

-- Organizations public view with conditional financial data masking
CREATE VIEW public.organizations_public_view
WITH (security_invoker = true)
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
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN stripe_customer_id ELSE NULL 
  END AS stripe_customer_id,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN stripe_subscription_id ELSE NULL 
  END AS stripe_subscription_id,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN subscription_status ELSE NULL 
  END AS subscription_status,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN subscription_tier ELSE NULL 
  END AS subscription_tier,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN subscription_started_at ELSE NULL 
  END AS subscription_started_at,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN subscription_ends_at ELSE NULL 
  END AS subscription_ends_at,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN trial_ends_at ELSE NULL 
  END AS trial_ends_at,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN usage_stats ELSE NULL 
  END AS usage_stats,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN features_enabled ELSE NULL 
  END AS features_enabled,
  CASE 
    WHEN get_org_member_role(auth.uid(), id) = ANY(ARRAY['admin', 'owner'])
    THEN settings ELSE NULL 
  END AS settings
FROM public.organizations;

GRANT SELECT ON public.organizations_public_view TO authenticated;
