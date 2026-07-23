ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS sector_data JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.beneficiaries.sector_data IS
  'Sector-specific field values (JSON keyed by field name from org_beneficiary_config.custom_fields). Rendered by BeneficiaryForm''s dynamic Sector Details step.';

NOTIFY pgrst, 'reload schema';