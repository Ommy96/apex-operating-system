
-- Guardians + beneficiary_guardians RLS
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can view guardians" ON public.guardians;
DROP POLICY IF EXISTS "Org members can insert guardians" ON public.guardians;
DROP POLICY IF EXISTS "Org members can update guardians" ON public.guardians;
DROP POLICY IF EXISTS "Org members can delete guardians" ON public.guardians;
CREATE POLICY "Org members can view guardians" ON public.guardians FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can insert guardians" ON public.guardians FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can update guardians" ON public.guardians FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can delete guardians" ON public.guardians FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

ALTER TABLE public.beneficiary_guardians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can view beneficiary_guardians" ON public.beneficiary_guardians;
CREATE POLICY "Org members can view beneficiary_guardians" ON public.beneficiary_guardians FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.beneficiaries b
    WHERE b.id = beneficiary_guardians.beneficiary_id
      AND b.organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  ));

-- Soft delete columns for volunteers
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Soft delete columns for donor_report_runs
ALTER TABLE public.donor_report_runs ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.donor_report_runs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

NOTIFY pgrst, 'reload schema';
