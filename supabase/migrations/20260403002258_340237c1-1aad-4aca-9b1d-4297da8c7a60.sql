
-- Add deleted_at for soft deletes
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.managed_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add updated_by audit column
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS updated_by UUID DEFAULT NULL;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS updated_by UUID DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_by UUID DEFAULT NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS updated_by UUID DEFAULT NULL;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS updated_by UUID DEFAULT NULL;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS updated_by UUID DEFAULT NULL;

-- Create indexes on deleted_at for performance
CREATE INDEX IF NOT EXISTS idx_beneficiaries_deleted_at ON public.beneficiaries (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_programs_deleted_at ON public.programs (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON public.expenses (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activities_deleted_at ON public.activities (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_volunteers_deleted_at ON public.volunteers (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_managed_documents_deleted_at ON public.managed_documents (deleted_at) WHERE deleted_at IS NULL;
