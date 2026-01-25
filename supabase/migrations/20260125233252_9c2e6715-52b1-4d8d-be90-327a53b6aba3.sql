-- Add linked_child_id to all legacy program tables for beneficiary deduplication

-- Feeding Program
ALTER TABLE public.feeding_program 
ADD COLUMN IF NOT EXISTS linked_child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feeding_program_linked_child_id ON public.feeding_program(linked_child_id);

-- Kipawa Sato
ALTER TABLE public.kipawa_sato 
ADD COLUMN IF NOT EXISTS linked_child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kipawa_sato_linked_child_id ON public.kipawa_sato(linked_child_id);

-- Self Empowerment
ALTER TABLE public.self_empowerment 
ADD COLUMN IF NOT EXISTS linked_child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_self_empowerment_linked_child_id ON public.self_empowerment(linked_child_id);

-- Medical Records
ALTER TABLE public.medical_records 
ADD COLUMN IF NOT EXISTS linked_child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_medical_records_linked_child_id ON public.medical_records(linked_child_id);

-- Family Adoption
ALTER TABLE public.family_adoption 
ADD COLUMN IF NOT EXISTS linked_child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_family_adoption_linked_child_id ON public.family_adoption(linked_child_id);

-- Support Groups (for individual members, not the group itself)
ALTER TABLE public.support_groups 
ADD COLUMN IF NOT EXISTS linked_child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_groups_linked_child_id ON public.support_groups(linked_child_id);

-- Update the unique beneficiary count function to check across ALL program tables
CREATE OR REPLACE FUNCTION public.get_unique_beneficiary_count(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT beneficiary_id)::integer
  FROM (
    -- Children from the main children table (Education program)
    SELECT id AS beneficiary_id FROM public.children WHERE organization_id = _org_id
    
    UNION
    
    -- Feeding Program: linked children or own ID if not linked
    SELECT COALESCE(linked_child_id, id) AS beneficiary_id 
    FROM public.feeding_program 
    WHERE organization_id = _org_id
    
    UNION
    
    -- Kipawa Sato: linked children or own ID if not linked
    SELECT COALESCE(linked_child_id, id) AS beneficiary_id 
    FROM public.kipawa_sato 
    WHERE organization_id = _org_id
    
    UNION
    
    -- Self Empowerment: linked children or own ID if not linked
    SELECT COALESCE(linked_child_id, id) AS beneficiary_id 
    FROM public.self_empowerment 
    WHERE organization_id = _org_id
    
    UNION
    
    -- Medical Records: linked children or own ID if not linked
    SELECT COALESCE(linked_child_id, id) AS beneficiary_id 
    FROM public.medical_records 
    WHERE organization_id = _org_id
    
    UNION
    
    -- Family Adoption: linked children or own ID if not linked
    SELECT COALESCE(linked_child_id, id) AS beneficiary_id 
    FROM public.family_adoption 
    WHERE organization_id = _org_id
    
    UNION
    
    -- Support Groups: linked children or own ID if not linked
    SELECT COALESCE(linked_child_id, id) AS beneficiary_id 
    FROM public.support_groups 
    WHERE organization_id = _org_id
    
    UNION
    
    -- Generic Entities: linked children or own ID if not linked
    SELECT COALESCE(linked_child_id, id) AS beneficiary_id 
    FROM public.entities 
    WHERE organization_id = _org_id
    
  ) AS all_beneficiaries
  WHERE beneficiary_id IS NOT NULL;
$$;