-- Add beneficiary_id column to entities table to link with children for deduplication
ALTER TABLE public.entities 
ADD COLUMN IF NOT EXISTS linked_child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

-- Create an index for faster lookups on linked_child_id
CREATE INDEX IF NOT EXISTS idx_entities_linked_child_id ON public.entities(linked_child_id);

-- Create a function to get unique beneficiary count for an organization
CREATE OR REPLACE FUNCTION public.get_unique_beneficiary_count(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT beneficiary_id)::integer
  FROM (
    -- Children from the legacy children table (using id as their own identifier)
    SELECT id AS beneficiary_id FROM public.children WHERE organization_id = _org_id
    
    UNION
    
    -- Entities linked to children (use the linked_child_id)
    SELECT linked_child_id AS beneficiary_id 
    FROM public.entities 
    WHERE organization_id = _org_id 
    AND linked_child_id IS NOT NULL
    
    UNION
    
    -- Entities not linked to children (each is a unique beneficiary)
    SELECT id AS beneficiary_id 
    FROM public.entities 
    WHERE organization_id = _org_id 
    AND linked_child_id IS NULL
  ) AS all_beneficiaries;
$$;

-- Create a function to search children for linking
CREATE OR REPLACE FUNCTION public.search_children_for_linking(_org_id uuid, _search_term text)
RETURNS TABLE(
  id uuid,
  student_id text,
  first_name text,
  last_name text,
  full_name text,
  gender text,
  academic_level text,
  institution_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    c.id,
    c.student_id,
    c.first_name,
    c.last_name,
    c.first_name || ' ' || c.last_name AS full_name,
    c.gender::text,
    c.academic_level::text,
    c.institution_name
  FROM public.children c
  WHERE c.organization_id = _org_id
  AND (
    c.first_name ILIKE '%' || _search_term || '%'
    OR c.last_name ILIKE '%' || _search_term || '%'
    OR c.student_id ILIKE '%' || _search_term || '%'
    OR (c.first_name || ' ' || c.last_name) ILIKE '%' || _search_term || '%'
  )
  ORDER BY c.first_name, c.last_name
  LIMIT 20;
$$;