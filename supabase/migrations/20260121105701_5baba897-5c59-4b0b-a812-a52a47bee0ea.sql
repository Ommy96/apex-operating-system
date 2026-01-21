-- ============================================
-- GENERIC ENTITY SYSTEM FOR SECTOR-AGNOSTIC DATA
-- ============================================

-- Entity Types: Defines what kinds of entities an organization tracks
-- Examples: "Beneficiaries", "Health Facilities", "Schools", "Farmers", "Projects"
CREATE TABLE public.entity_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Users',
  color TEXT DEFAULT 'blue',
  -- Field schema defines the structure of entities of this type
  -- Example: [{"name": "age", "type": "number", "label": "Age", "required": true}, ...]
  field_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Settings for display and behavior
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure unique slug per organization
  CONSTRAINT entity_types_org_slug_unique UNIQUE (organization_id, slug)
);

-- Entities: Individual records of any entity type
-- This replaces hard-coded tables like "children", "beneficiaries", etc.
CREATE TABLE public.entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type_id UUID NOT NULL REFERENCES public.entity_types(id) ON DELETE CASCADE,
  -- Primary display name for the entity
  display_name TEXT NOT NULL,
  -- All entity data stored as flexible JSONB
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Common metadata
  status TEXT DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Entity Relationships: Links between entities (e.g., child -> household, patient -> facility)
CREATE TABLE public.entity_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- e.g., "belongs_to", "manages", "enrolled_in"
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Prevent duplicate relationships
  CONSTRAINT entity_relationships_unique UNIQUE (source_entity_id, target_entity_id, relationship_type)
);

-- Create indexes for performance
CREATE INDEX idx_entity_types_org ON public.entity_types(organization_id);
CREATE INDEX idx_entity_types_slug ON public.entity_types(organization_id, slug);
CREATE INDEX idx_entities_org ON public.entities(organization_id);
CREATE INDEX idx_entities_type ON public.entities(entity_type_id);
CREATE INDEX idx_entities_status ON public.entities(status);
CREATE INDEX idx_entities_data ON public.entities USING GIN(data);
CREATE INDEX idx_entities_tags ON public.entities USING GIN(tags);
CREATE INDEX idx_entity_relationships_source ON public.entity_relationships(source_entity_id);
CREATE INDEX idx_entity_relationships_target ON public.entity_relationships(target_entity_id);

-- Enable RLS
ALTER TABLE public.entity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for entity_types
CREATE POLICY "Users can view entity types in their organization"
  ON public.entity_types FOR SELECT
  USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert entity types"
  ON public.entity_types FOR INSERT
  WITH CHECK (
    user_belongs_to_org(auth.uid(), organization_id) AND
    get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "Org admins can update entity types"
  ON public.entity_types FOR UPDATE
  USING (
    user_belongs_to_org(auth.uid(), organization_id) AND
    get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "Org admins can delete entity types"
  ON public.entity_types FOR DELETE
  USING (
    user_belongs_to_org(auth.uid(), organization_id) AND
    get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- RLS Policies for entities
CREATE POLICY "Users can view entities in their organization"
  ON public.entities FOR SELECT
  USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert entities in their organization"
  ON public.entities FOR INSERT
  WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update entities in their organization"
  ON public.entities FOR UPDATE
  USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete entities"
  ON public.entities FOR DELETE
  USING (
    user_belongs_to_org(auth.uid(), organization_id) AND
    get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- RLS Policies for entity_relationships
CREATE POLICY "Users can view entity relationships in their organization"
  ON public.entity_relationships FOR SELECT
  USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert entity relationships in their organization"
  ON public.entity_relationships FOR INSERT
  WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update entity relationships in their organization"
  ON public.entity_relationships FOR UPDATE
  USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete entity relationships"
  ON public.entity_relationships FOR DELETE
  USING (
    user_belongs_to_org(auth.uid(), organization_id) AND
    get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER update_entity_types_updated_at
  BEFORE UPDATE ON public.entity_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();