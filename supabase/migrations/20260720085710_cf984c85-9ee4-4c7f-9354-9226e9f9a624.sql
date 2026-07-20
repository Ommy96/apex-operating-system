
CREATE POLICY "Donors read own beneficiary_donors"
ON public.beneficiary_donors
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.donor_accounts da
    WHERE da.user_id = auth.uid()
      AND da.is_active = true
      AND da.organization_id = beneficiary_donors.organization_id
      AND da.donor_name = beneficiary_donors.donor_name
  )
);

NOTIFY pgrst, 'reload schema';
