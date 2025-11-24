-- Add family_adoption_id to documents table to support family adoption documents
ALTER TABLE public.documents 
ADD COLUMN family_adoption_id uuid REFERENCES public.family_adoption(id) ON DELETE CASCADE;

-- Add check constraint to ensure either child_id or family_adoption_id is set, but not both
ALTER TABLE public.documents
ADD CONSTRAINT documents_entity_check CHECK (
  (child_id IS NOT NULL AND family_adoption_id IS NULL) OR
  (child_id IS NULL AND family_adoption_id IS NOT NULL)
);