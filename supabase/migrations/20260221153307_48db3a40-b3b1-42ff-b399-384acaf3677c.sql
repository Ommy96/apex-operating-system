
-- Backfill existing beneficiary_donors into financial_transactions
INSERT INTO public.financial_transactions (
  organization_id, transaction_type, amount, currency, transaction_date,
  donor_name, donor_id, program_id, beneficiary_id,
  funding_category, description, created_by
)
SELECT
  bd.organization_id,
  'beneficiary_support',
  COALESCE(bd.amount_received, 0),
  'KES',
  COALESCE(bd.donation_date::date, CURRENT_DATE),
  bd.donor_name,
  bd.id,
  bd.program_id,
  bd.beneficiary_id,
  'Beneficiary Sponsorship',
  'Donor support: ' || bd.donor_name || ' for beneficiary (backfill)',
  bd.created_by
FROM public.beneficiary_donors bd
WHERE NOT EXISTS (
  SELECT 1 FROM public.financial_transactions ft
  WHERE ft.donor_id = bd.id AND ft.transaction_type = 'beneficiary_support'
);

-- Also backfill existing expenses if any are missing
INSERT INTO public.financial_transactions (
  organization_id, transaction_type, amount, currency, transaction_date,
  program_id, project_id, expense_id,
  funding_category, description, created_by
)
SELECT
  e.organization_id,
  'expense',
  COALESCE(e.amount, 0),
  COALESCE(e.currency, 'KES'),
  COALESCE(e.expense_date::date, CURRENT_DATE),
  e.program_id,
  e.project_id,
  e.id,
  COALESCE(e.payment_method, 'General'),
  e.title,
  e.created_by
FROM public.expenses e
WHERE NOT EXISTS (
  SELECT 1 FROM public.financial_transactions ft
  WHERE ft.expense_id = e.id AND ft.transaction_type = 'expense'
);
