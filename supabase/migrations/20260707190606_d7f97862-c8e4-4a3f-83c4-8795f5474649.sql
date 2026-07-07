ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS tier_label_program  TEXT NOT NULL DEFAULT 'Programme',
  ADD COLUMN IF NOT EXISTS tier_label_project  TEXT NOT NULL DEFAULT 'Project',
  ADD COLUMN IF NOT EXISTS tier_label_activity TEXT NOT NULL DEFAULT 'Activity';
NOTIFY pgrst, 'reload schema';