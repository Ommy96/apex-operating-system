
-- =========================================================
-- 3.1 ENUMS
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.allocation_scope AS ENUM ('direct_beneficiary','project_pool','program_unrestricted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.allocation_status AS ENUM ('active','held','redirected','consumed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.donation_intent_kind AS ENUM ('beneficiary','project','program','unrestricted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- donation_intents
-- =========================================================
CREATE TABLE IF NOT EXISTS public.donation_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  donor_account_id UUID NOT NULL REFERENCES public.donor_accounts(id) ON DELETE CASCADE,
  kind public.donation_intent_kind NOT NULL,
  target_beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  target_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  target_program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  lock_to_beneficiary BOOLEAN NOT NULL DEFAULT true,
  committed_amount NUMERIC,
  committed_currency TEXT,
  committed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT donation_intents_target_chk CHECK (
    (kind = 'beneficiary' AND target_beneficiary_id IS NOT NULL) OR
    (kind = 'project' AND target_project_id IS NOT NULL) OR
    (kind = 'program' AND target_program_id IS NOT NULL) OR
    (kind = 'unrestricted')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.donation_intents TO authenticated;
GRANT ALL ON public.donation_intents TO service_role;
ALTER TABLE public.donation_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "donation_intents_org_select" ON public.donation_intents
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "donation_intents_org_insert" ON public.donation_intents
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "donation_intents_org_update" ON public.donation_intents
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "donation_intents_org_delete" ON public.donation_intents
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_donation_intents_org ON public.donation_intents(organization_id);
CREATE INDEX IF NOT EXISTS idx_donation_intents_donor ON public.donation_intents(donor_account_id);
CREATE INDEX IF NOT EXISTS idx_donation_intents_target_ben ON public.donation_intents(target_beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_donation_intents_target_proj ON public.donation_intents(target_project_id);

CREATE TRIGGER trg_donation_intents_updated_at
  BEFORE UPDATE ON public.donation_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- donor_pools
-- =========================================================
CREATE TABLE IF NOT EXISTS public.donor_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  donor_account_id UUID NOT NULL REFERENCES public.donor_accounts(id) ON DELETE CASCADE,
  scope public.allocation_scope NOT NULL,
  scope_beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  scope_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  scope_program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  currency TEXT NOT NULL,
  balance_native NUMERIC NOT NULL DEFAULT 0,
  balance_base NUMERIC NOT NULL DEFAULT 0,
  last_fx_rate NUMERIC,
  last_fx_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique with COALESCE for nullable scope FKs
CREATE UNIQUE INDEX IF NOT EXISTS uq_donor_pools_scope
  ON public.donor_pools (
    organization_id,
    donor_account_id,
    scope,
    COALESCE(scope_beneficiary_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(scope_project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(scope_program_id, '00000000-0000-0000-0000-000000000000'::uuid),
    currency
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.donor_pools TO authenticated;
GRANT ALL ON public.donor_pools TO service_role;
ALTER TABLE public.donor_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "donor_pools_org_select" ON public.donor_pools
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "donor_pools_org_insert" ON public.donor_pools
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "donor_pools_org_update" ON public.donor_pools
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "donor_pools_org_delete" ON public.donor_pools
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_donor_pools_org_donor ON public.donor_pools(organization_id, donor_account_id);
CREATE INDEX IF NOT EXISTS idx_donor_pools_balance ON public.donor_pools(organization_id, balance_base DESC);

CREATE TRIGGER trg_donor_pools_updated_at
  BEFORE UPDATE ON public.donor_pools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Extend donations: link to donor_account + intent
-- =========================================================
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS donor_account_id UUID REFERENCES public.donor_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS donation_intent_id UUID REFERENCES public.donation_intents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_donations_donor_account ON public.donations(donor_account_id);
CREATE INDEX IF NOT EXISTS idx_donations_intent ON public.donations(donation_intent_id);

-- =========================================================
-- allocations
-- =========================================================
CREATE TABLE IF NOT EXISTS public.allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  donor_pool_id UUID NOT NULL REFERENCES public.donor_pools(id),
  donor_account_id UUID NOT NULL REFERENCES public.donor_accounts(id),
  donation_id UUID REFERENCES public.donations(id) ON DELETE SET NULL,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  activity_disbursement_id UUID REFERENCES public.activity_disbursements(id) ON DELETE SET NULL,
  scope public.allocation_scope NOT NULL,
  amount_native NUMERIC NOT NULL,
  native_currency TEXT NOT NULL,
  fx_rate NUMERIC NOT NULL,
  fx_at TIMESTAMPTZ NOT NULL,
  amount_base NUMERIC NOT NULL,
  base_currency TEXT NOT NULL,
  status public.allocation_status NOT NULL DEFAULT 'active',
  reason TEXT,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  allocated_by UUID REFERENCES auth.users(id),
  parent_allocation_id UUID REFERENCES public.allocations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allocations TO authenticated;
GRANT ALL ON public.allocations TO service_role;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allocations_org_select" ON public.allocations
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "allocations_org_insert" ON public.allocations
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "allocations_org_update" ON public.allocations
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "allocations_org_delete" ON public.allocations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_allocations_org_ben_status ON public.allocations (organization_id, beneficiary_id, status);
CREATE INDEX IF NOT EXISTS idx_allocations_org_pool ON public.allocations (organization_id, donor_pool_id);
CREATE INDEX IF NOT EXISTS idx_allocations_org_proj_status ON public.allocations (organization_id, project_id, status);
CREATE INDEX IF NOT EXISTS idx_allocations_org_donor ON public.allocations (organization_id, donor_account_id);
CREATE INDEX IF NOT EXISTS idx_allocations_allocated_at ON public.allocations (organization_id, allocated_at DESC);

CREATE TRIGGER trg_allocations_updated_at
  BEFORE UPDATE ON public.allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- allocation_overrides
-- =========================================================
CREATE TABLE IF NOT EXISTS public.allocation_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  allocation_id UUID NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  overridden_by UUID NOT NULL REFERENCES auth.users(id),
  overridden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL,
  before_status public.allocation_status,
  after_status public.allocation_status,
  before_beneficiary_id UUID,
  after_beneficiary_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.allocation_overrides TO authenticated;
GRANT ALL ON public.allocation_overrides TO service_role;
ALTER TABLE public.allocation_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allocation_overrides_org_select" ON public.allocation_overrides
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "allocation_overrides_org_insert" ON public.allocation_overrides
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_allocation_overrides_alloc ON public.allocation_overrides(allocation_id);
CREATE INDEX IF NOT EXISTS idx_allocation_overrides_org ON public.allocation_overrides(organization_id, overridden_at DESC);

-- =========================================================
-- Backfill: beneficiary_donors → donation_intents (kind=beneficiary)
-- Only insert if a matching intent doesn't already exist
-- =========================================================
INSERT INTO public.donation_intents (
  organization_id, donor_account_id, kind, target_beneficiary_id,
  target_program_id, lock_to_beneficiary, committed_amount,
  committed_currency, committed_at, notes, created_by
)
SELECT
  bd.organization_id,
  da.id AS donor_account_id,
  'beneficiary'::public.donation_intent_kind,
  bd.beneficiary_id,
  bd.program_id,
  true,
  bd.amount_received,
  'KES',
  COALESCE(bd.donation_date::timestamptz, bd.created_at, now()),
  bd.notes,
  bd.created_by
FROM public.beneficiary_donors bd
JOIN public.donor_accounts da
  ON da.organization_id = bd.organization_id
 AND lower(da.donor_name) = lower(bd.donor_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.donation_intents di
  WHERE di.organization_id = bd.organization_id
    AND di.donor_account_id = da.id
    AND di.kind = 'beneficiary'
    AND di.target_beneficiary_id = bd.beneficiary_id
);

NOTIFY pgrst, 'reload schema';
