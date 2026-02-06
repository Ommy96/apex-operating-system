-- =====================================================
-- PROGRAM MANAGEMENT MODULE: Schema Enhancement (Corrected)
-- =====================================================

-- 1. Enhance PROGRAMS table with additional fields
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS target_population TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS geographic_coverage JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS program_manager_id UUID,
ADD COLUMN IF NOT EXISTS objectives TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2. Create PROGRAM_DONORS junction table for multiple donors per program
CREATE TABLE IF NOT EXISTS public.program_donors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE SET NULL,
  donor_name TEXT,
  contribution_amount NUMERIC,
  contribution_date DATE,
  notes TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enhance PROJECTS table with additional fields
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS target_beneficiary_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expected_outputs TEXT,
ADD COLUMN IF NOT EXISTS project_lead_id UUID;

-- 4. Enhance existing ACTIVITIES table (add project linking and new fields)
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS activity_type TEXT,
ADD COLUMN IF NOT EXISTS planned_date DATE,
ADD COLUMN IF NOT EXISTS actual_date DATE,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS responsible_staff_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned',
ADD COLUMN IF NOT EXISTS expected_participants INTEGER,
ADD COLUMN IF NOT EXISTS actual_participants INTEGER,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. Enhance BENEFICIARY_SERVICES for program enrollment (project + activity linking)
ALTER TABLE public.beneficiary_services
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS activity_id UUID,
ADD COLUMN IF NOT EXISTS exit_date DATE;

-- 6. Create ACTIVITY_ATTENDANCE table for beneficiary activity attendance
CREATE TABLE IF NOT EXISTS public.activity_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attendance_status TEXT DEFAULT 'present',
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id, beneficiary_id)
);

-- 7. Create PROGRAM_OBSERVATIONS table for structured observations
CREATE TABLE IF NOT EXISTS public.program_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  observation_date DATE NOT NULL,
  observation_category TEXT,
  narrative_notes TEXT NOT NULL,
  recommended_action TEXT,
  follow_up_date DATE,
  assigned_staff_id UUID,
  status TEXT DEFAULT 'open',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Create PROGRAM_INDICATORS for M&E tracking at program/project level
CREATE TABLE IF NOT EXISTS public.program_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  indicator_type TEXT,
  measurement_unit TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  reporting_frequency TEXT,
  data_collection_method TEXT,
  responsible_person_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_program_donors_program ON public.program_donors(program_id);
CREATE INDEX IF NOT EXISTS idx_program_donors_org ON public.program_donors(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_project ON public.activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_org ON public.activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_activity ON public.activity_attendance(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_beneficiary ON public.activity_attendance(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_program_observations_org ON public.program_observations(organization_id);
CREATE INDEX IF NOT EXISTS idx_program_observations_beneficiary ON public.program_observations(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_program_indicators_program ON public.program_indicators(program_id);
CREATE INDEX IF NOT EXISTS idx_program_indicators_project ON public.program_indicators(project_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_services_project ON public.beneficiary_services(project_id);