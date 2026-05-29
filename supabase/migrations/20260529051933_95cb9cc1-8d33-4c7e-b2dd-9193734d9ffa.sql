ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS setup_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS setup_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz;

-- Backfill: existing orgs that have already completed onboarding are treated as setup-done
UPDATE public.organizations
SET setup_completed = true,
    setup_completed_at = COALESCE(setup_completed_at, onboarding_completed_at, now())
WHERE COALESCE(onboarding_completed, false) = true
  AND setup_completed = false;