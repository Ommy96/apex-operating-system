
-- Phase 3.4: Donor Portal extensions

-- 1. Preferred currency on donor_accounts
ALTER TABLE public.donor_accounts
  ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'USD';

-- 2. RLS so donors can read allocations & pools tied to their account
DROP POLICY IF EXISTS "Donors read own allocations" ON public.allocations;
CREATE POLICY "Donors read own allocations" ON public.allocations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.donor_accounts da
      WHERE da.id = allocations.donor_account_id
        AND da.user_id = auth.uid()
        AND da.is_active = true
    )
  );

DROP POLICY IF EXISTS "Donors read own pools" ON public.donor_pools;
CREATE POLICY "Donors read own pools" ON public.donor_pools
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.donor_accounts da
      WHERE da.id = donor_pools.donor_account_id
        AND da.user_id = auth.uid()
        AND da.is_active = true
    )
  );

-- 3. Allow donors to read published impact_stories tied to beneficiaries they sponsor
DROP POLICY IF EXISTS "Donors read impact stories for sponsored beneficiaries" ON public.impact_stories;
CREATE POLICY "Donors read impact stories for sponsored beneficiaries" ON public.impact_stories
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.donor_accounts da
      JOIN public.beneficiary_donors bd
        ON bd.donor_name = da.donor_name
       AND bd.organization_id = da.organization_id
      WHERE da.user_id = auth.uid()
        AND da.is_active = true
        AND da.organization_id = impact_stories.org_id
        AND bd.beneficiary_id = impact_stories.beneficiary_id
    )
  );
