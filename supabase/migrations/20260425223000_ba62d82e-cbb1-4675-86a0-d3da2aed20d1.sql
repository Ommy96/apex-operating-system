-- Beneficiary relationships table
CREATE TABLE IF NOT EXISTS public.beneficiary_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_a_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  beneficiary_b_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  relationship_label TEXT,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  is_primary_household_link BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT beneficiary_relationships_unique UNIQUE (organization_id, beneficiary_a_id, beneficiary_b_id, relationship_type),
  CONSTRAINT beneficiary_relationships_distinct CHECK (beneficiary_a_id <> beneficiary_b_id)
);

CREATE INDEX IF NOT EXISTS idx_benrel_org ON public.beneficiary_relationships(organization_id);
CREATE INDEX IF NOT EXISTS idx_benrel_a ON public.beneficiary_relationships(beneficiary_a_id);
CREATE INDEX IF NOT EXISTS idx_benrel_b ON public.beneficiary_relationships(beneficiary_b_id);
CREATE INDEX IF NOT EXISTS idx_benrel_household ON public.beneficiary_relationships(household_id);

-- Validate relationship type via trigger
CREATE OR REPLACE FUNCTION public.validate_beneficiary_relationship_type()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.relationship_type NOT IN (
    'parent_child','child_parent','spouse','sibling',
    'grandparent_grandchild','grandchild_grandparent',
    'aunt_uncle_niece_nephew','niece_nephew_aunt_uncle',
    'guardian_ward','ward_guardian','other_family'
  ) THEN
    RAISE EXCEPTION 'Invalid relationship_type: %', NEW.relationship_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_benrel ON public.beneficiary_relationships;
CREATE TRIGGER trg_validate_benrel
  BEFORE INSERT OR UPDATE ON public.beneficiary_relationships
  FOR EACH ROW EXECUTE FUNCTION public.validate_beneficiary_relationship_type();

-- RLS
ALTER TABLE public.beneficiary_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members view relationships" ON public.beneficiary_relationships;
CREATE POLICY "Org members view relationships" ON public.beneficiary_relationships
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members insert relationships" ON public.beneficiary_relationships;
CREATE POLICY "Org members insert relationships" ON public.beneficiary_relationships
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members update relationships" ON public.beneficiary_relationships;
CREATE POLICY "Org members update relationships" ON public.beneficiary_relationships
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members delete relationships" ON public.beneficiary_relationships;
CREATE POLICY "Org members delete relationships" ON public.beneficiary_relationships
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Households additional columns
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS relationship_formed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS formed_from_relationship_id UUID REFERENCES public.beneficiary_relationships(id) ON DELETE SET NULL;

-- Auto-update household.member_count
CREATE OR REPLACE FUNCTION public.update_household_member_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.household_id IS NOT NULL THEN
    UPDATE public.households
    SET member_count = (
      SELECT COUNT(*) FROM public.beneficiaries
      WHERE household_id = NEW.household_id AND deleted_at IS NULL
    )
    WHERE id = NEW.household_id;
  END IF;
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.household_id IS NOT NULL
     AND (TG_OP = 'DELETE' OR NEW.household_id IS DISTINCT FROM OLD.household_id) THEN
    UPDATE public.households
    SET member_count = (
      SELECT COUNT(*) FROM public.beneficiaries
      WHERE household_id = OLD.household_id AND deleted_at IS NULL
    )
    WHERE id = OLD.household_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_household_member_count ON public.beneficiaries;
CREATE TRIGGER trg_household_member_count
  AFTER INSERT OR UPDATE OF household_id OR DELETE ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.update_household_member_count();

-- Dismissed household suggestions (per user)
CREATE TABLE IF NOT EXISTS public.dismissed_household_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  beneficiary_a_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  beneficiary_b_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, user_id, beneficiary_a_id, beneficiary_b_id)
);

ALTER TABLE public.dismissed_household_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own dismissed suggestions" ON public.dismissed_household_suggestions;
CREATE POLICY "Users view own dismissed suggestions" ON public.dismissed_household_suggestions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.user_belongs_to_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Users insert own dismissed suggestions" ON public.dismissed_household_suggestions;
CREATE POLICY "Users insert own dismissed suggestions" ON public.dismissed_household_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.user_belongs_to_org(auth.uid(), organization_id));

-- Initialize member_count for existing households
UPDATE public.households h
SET member_count = (
  SELECT COUNT(*) FROM public.beneficiaries b
  WHERE b.household_id = h.id AND b.deleted_at IS NULL
);