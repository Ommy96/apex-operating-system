-- Remove orphaned financial transaction for Dickens (donor_id is null, backfill record)
DELETE FROM public.financial_transactions WHERE id = '83d77c63-1dc0-43b4-aa67-9591195dd4f9';