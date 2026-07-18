ALTER TABLE public.households ADD COLUMN IF NOT EXISTS head_guardian_id uuid REFERENCES public.guardians(id) ON DELETE SET NULL;
NOTIFY pgrst, 'reload schema';