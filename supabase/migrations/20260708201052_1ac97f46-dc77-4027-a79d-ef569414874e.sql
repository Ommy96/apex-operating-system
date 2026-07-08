
-- 1. Restriction columns on donation_intents
ALTER TABLE public.donation_intents
  ADD COLUMN IF NOT EXISTS restriction TEXT NOT NULL DEFAULT 'restricted'
    CHECK (restriction IN ('restricted','unrestricted','time_restricted')),
  ADD COLUMN IF NOT EXISTS restriction_note TEXT,
  ADD COLUMN IF NOT EXISTS restriction_expires_at DATE;

-- 2. Restriction columns on grants
ALTER TABLE public.grants
  ADD COLUMN IF NOT EXISTS restriction TEXT NOT NULL DEFAULT 'restricted'
    CHECK (restriction IN ('restricted','unrestricted','time_restricted')),
  ADD COLUMN IF NOT EXISTS restriction_note TEXT,
  ADD COLUMN IF NOT EXISTS restriction_expires_at DATE;

-- 3. Denormalize restriction onto donor_pools and allocations for fast reporting
ALTER TABLE public.donor_pools
  ADD COLUMN IF NOT EXISTS restriction TEXT NOT NULL DEFAULT 'restricted'
    CHECK (restriction IN ('restricted','unrestricted','time_restricted'));

ALTER TABLE public.allocations
  ADD COLUMN IF NOT EXISTS restriction TEXT NOT NULL DEFAULT 'restricted'
    CHECK (restriction IN ('restricted','unrestricted','time_restricted'));

-- 4. Backfill intents: kind='unrestricted' -> unrestricted, else restricted
UPDATE public.donation_intents
   SET restriction = 'unrestricted'
 WHERE kind = 'unrestricted';

-- 5. Backfill donor_pools by scope
UPDATE public.donor_pools
   SET restriction = 'unrestricted'
 WHERE scope = 'program_unrestricted';
UPDATE public.donor_pools
   SET restriction = 'restricted'
 WHERE scope IN ('project_pool','direct_beneficiary');

-- 6. Backfill allocations by scope
UPDATE public.allocations
   SET restriction = 'unrestricted'
 WHERE scope = 'program_unrestricted';
UPDATE public.allocations
   SET restriction = 'restricted'
 WHERE scope IN ('project_pool','direct_beneficiary');

-- 7. Helpful index for restricted-vs-unrestricted rollups
CREATE INDEX IF NOT EXISTS idx_donor_pools_org_restriction
  ON public.donor_pools (organization_id, restriction);
CREATE INDEX IF NOT EXISTS idx_allocations_org_restriction
  ON public.allocations (organization_id, restriction);

NOTIFY pgrst, 'reload schema';
