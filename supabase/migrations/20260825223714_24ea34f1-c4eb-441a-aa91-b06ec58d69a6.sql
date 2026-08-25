
-- 1. sponsor_relationships
CREATE TABLE IF NOT EXISTS public.sponsor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  donor_account_id UUID REFERENCES public.donor_accounts(id) ON DELETE SET NULL,
  donor_name TEXT,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  started_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_on DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','lapsed','ended','transferred')),
  relationship_type TEXT NOT NULL DEFAULT 'primary' CHECK (relationship_type IN ('primary','co_sponsor','correspondent')),
  correspondence_enabled BOOLEAN NOT NULL DEFAULT true,
  package_id UUID REFERENCES public.sponsorship_packages(id) ON DELETE SET NULL,
  end_reason TEXT,
  transferred_to_beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_relationships TO authenticated;
GRANT ALL ON public.sponsor_relationships TO service_role;

ALTER TABLE public.sponsor_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view sponsor relationships"
  ON public.sponsor_relationships FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members can create sponsor relationships"
  ON public.sponsor_relationships FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org members can update sponsor relationships"
  ON public.sponsor_relationships FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
CREATE POLICY "Org members can delete sponsor relationships"
  ON public.sponsor_relationships FOR DELETE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS idx_sponsor_rel_ben ON public.sponsor_relationships (organization_id, beneficiary_id, status);
CREATE INDEX IF NOT EXISTS idx_sponsor_rel_donor ON public.sponsor_relationships (organization_id, donor_account_id, status);

DROP TRIGGER IF EXISTS trg_sponsor_rel_touch ON public.sponsor_relationships;
CREATE TRIGGER trg_sponsor_rel_touch BEFORE UPDATE ON public.sponsor_relationships
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 1b. migrate existing beneficiary_donors into relationships (one row per donor+beneficiary)
INSERT INTO public.sponsor_relationships
  (organization_id, donor_account_id, donor_name, beneficiary_id, started_on, status, relationship_type, package_id, notes, created_by, created_at)
SELECT DISTINCT ON (bd.organization_id, bd.beneficiary_id, lower(trim(bd.donor_name)))
  bd.organization_id,
  da.id,
  bd.donor_name,
  bd.beneficiary_id,
  COALESCE(bd.donation_date, bd.created_at::date, CURRENT_DATE),
  'active',
  'primary',
  bd.sponsorship_package_id,
  'Migrated from beneficiary_donors',
  bd.created_by,
  COALESCE(bd.created_at, now())
FROM public.beneficiary_donors bd
LEFT JOIN public.donor_accounts da
  ON da.organization_id = bd.organization_id
 AND lower(trim(da.donor_name)) = lower(trim(bd.donor_name))
WHERE bd.beneficiary_id IS NOT NULL
  AND COALESCE(trim(bd.donor_name),'') <> ''
ORDER BY bd.organization_id, bd.beneficiary_id, lower(trim(bd.donor_name)), bd.donation_date DESC NULLS LAST;

-- 2. org funding model
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS sponsorship_funding_model TEXT NOT NULL DEFAULT 'direct_attribution';
DO $$ BEGIN
  ALTER TABLE public.organizations ADD CONSTRAINT organizations_sponsorship_funding_model_check
    CHECK (sponsorship_funding_model IN ('direct_attribution','pooled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. beneficiary lifecycle
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS lifecycle_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lifecycle_changed_by UUID,
  ADD COLUMN IF NOT EXISTS exit_reason TEXT,
  ADD COLUMN IF NOT EXISTS alumni_since DATE,
  ADD COLUMN IF NOT EXISTS alumni_outcome TEXT,
  ADD COLUMN IF NOT EXISTS alumni_outcome_note TEXT,
  ADD COLUMN IF NOT EXISTS alumni_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS alumni_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS alumni_contact_consent BOOLEAN NOT NULL DEFAULT false;

UPDATE public.beneficiaries SET lifecycle_stage = CASE
  WHEN deleted_at IS NOT NULL THEN 'archived'
  WHEN lower(COALESCE(status,'')) IN ('graduated','completed') THEN 'alumni'
  WHEN lower(COALESCE(status,'')) IN ('inactive','exited','dropped','withdrawn','replaced') THEN 'exited'
  WHEN lower(COALESCE(status,'')) IN ('paused','on hold','suspended') THEN 'paused'
  ELSE 'active' END
WHERE lifecycle_changed_at IS NULL;

UPDATE public.beneficiaries SET alumni_since = COALESCE(alumni_since, updated_at::date)
WHERE lifecycle_stage = 'alumni' AND alumni_since IS NULL;

DO $$ BEGIN
  ALTER TABLE public.beneficiaries ADD CONSTRAINT beneficiaries_lifecycle_stage_check
    CHECK (lifecycle_stage IN ('applicant','waiting_list','active','paused','alumni','exited','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_beneficiaries_lifecycle ON public.beneficiaries (organization_id, lifecycle_stage);

NOTIFY pgrst, 'reload schema';
