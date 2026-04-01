-- Delete financial_transactions first (to avoid trigger conflicts)
DELETE FROM public.financial_transactions 
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';

-- Delete beneficiary_donors
DELETE FROM public.beneficiary_donors 
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';