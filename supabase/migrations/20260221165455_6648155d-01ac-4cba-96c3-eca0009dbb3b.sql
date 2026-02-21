-- Clean up orphaned beneficiary_donor record for Dickens Sambili Aburiri
-- This old record was not edited in-place; instead a new one was created, leaving the old one behind
DELETE FROM public.beneficiary_donors WHERE id = '5d264dd3-2dc8-4a75-bd35-941c48f45a7c';

-- The trigger will automatically clean up the corresponding financial_transaction