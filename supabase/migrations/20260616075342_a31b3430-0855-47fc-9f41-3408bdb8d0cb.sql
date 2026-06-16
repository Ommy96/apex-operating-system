-- Force PostgREST to reload its schema cache so newly-added columns
-- on public.beneficiaries become visible to the API.
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

NOTIFY pgrst, 'reload schema';