
-- Delete orphaned duplicate financial_transactions with stale donor names
-- These are backfill records with no donor_id link, duplicated by properly linked records
DELETE FROM public.financial_transactions 
WHERE id IN ('f0354406-8b88-40a9-a924-cdef10aa7c21', '2bd4a255-be0f-4886-82b8-3477113a91f3');
