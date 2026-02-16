
-- Phase 2 Cleanup: Drop all unused legacy program tables and admin tables
-- Order matters due to foreign key constraints

-- Drop tables with FK dependencies first
DROP TABLE IF EXISTS public.loan_repayments CASCADE;
DROP TABLE IF EXISTS public.business_visit_reports CASCADE;
DROP TABLE IF EXISTS public.support_group_activities CASCADE;
DROP TABLE IF EXISTS public.support_ticket_messages CASCADE;

-- Drop legacy program tables
DROP TABLE IF EXISTS public.feeding_program CASCADE;
DROP TABLE IF EXISTS public.kipawa_sato CASCADE;
DROP TABLE IF EXISTS public.self_empowerment CASCADE;
DROP TABLE IF EXISTS public.medical_records CASCADE;
DROP TABLE IF EXISTS public.family_adoption CASCADE;
DROP TABLE IF EXISTS public.support_groups CASCADE;
DROP TABLE IF EXISTS public.alumni CASCADE;
DROP TABLE IF EXISTS public.sponsors CASCADE;
DROP TABLE IF EXISTS public.replacements CASCADE;
DROP TABLE IF EXISTS public.transport_records CASCADE;
DROP TABLE IF EXISTS public.visits CASCADE;
DROP TABLE IF EXISTS public.attendance_records CASCADE;
DROP TABLE IF EXISTS public.school_visit_reports CASCADE;
DROP TABLE IF EXISTS public.home_visit_reports CASCADE;

-- Drop unused admin tables
DROP TABLE IF EXISTS public.platform_announcements CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.system_health_logs CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- Update the get_unique_beneficiary_count function to remove legacy table references
CREATE OR REPLACE FUNCTION public.get_unique_beneficiary_count(_org_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(DISTINCT beneficiary_id)::integer
  FROM (
    -- Children from the main children table
    SELECT id AS beneficiary_id FROM public.children WHERE organization_id = _org_id
    
    UNION
    
    -- Beneficiaries table
    SELECT id AS beneficiary_id FROM public.beneficiaries WHERE organization_id = _org_id
    
    UNION
    
    -- Generic Entities
    SELECT COALESCE(linked_child_id, id) AS beneficiary_id 
    FROM public.entities 
    WHERE organization_id = _org_id
    
  ) AS all_beneficiaries
  WHERE beneficiary_id IS NOT NULL;
$function$;

-- Update the check_org_usage_limit function to remove legacy table references
CREATE OR REPLACE FUNCTION public.check_org_usage_limit(_org_id uuid, _limit_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_features jsonb;
  current_count integer;
  max_limit integer;
BEGIN
  SELECT features_enabled INTO org_features
  FROM public.organizations
  WHERE id = _org_id;
  
  IF org_features IS NULL THEN
    RETURN false;
  END IF;
  
  IF _limit_type = 'users' THEN
    SELECT COUNT(*) INTO current_count
    FROM public.organization_members
    WHERE organization_id = _org_id;
    max_limit := (org_features->>'max_users')::integer;
  ELSIF _limit_type = 'beneficiaries' THEN
    SELECT COUNT(*) INTO current_count
    FROM (
      SELECT id FROM public.children WHERE organization_id = _org_id
      UNION
      SELECT id FROM public.beneficiaries WHERE organization_id = _org_id
      UNION
      SELECT id FROM public.entities WHERE organization_id = _org_id
    ) as all_beneficiaries;
    max_limit := (org_features->>'max_beneficiaries')::integer;
  ELSE
    RETURN true;
  END IF;
  
  RETURN current_count < max_limit;
END;
$function$;
