
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS estimated_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funding_cycle text DEFAULT 'annually',
  ADD COLUMN IF NOT EXISTS sponsorship_required boolean DEFAULT false;
