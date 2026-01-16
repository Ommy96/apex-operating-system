-- Phase 2: Add organization_id to all existing tables
-- Using Heart to Heart Organization ID as default

-- Add organization_id to children table
ALTER TABLE public.children 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.children SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.children ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_children_organization_id ON public.children(organization_id);

-- Add organization_id to programs table
ALTER TABLE public.programs 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.programs SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.programs ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_programs_organization_id ON public.programs(organization_id);

-- Add organization_id to sponsors table
ALTER TABLE public.sponsors 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.sponsors SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.sponsors ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_sponsors_organization_id ON public.sponsors(organization_id);

-- Add organization_id to alumni table
ALTER TABLE public.alumni 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.alumni SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.alumni ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_alumni_organization_id ON public.alumni(organization_id);

-- Add organization_id to medical_records table
ALTER TABLE public.medical_records 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.medical_records SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.medical_records ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_medical_records_organization_id ON public.medical_records(organization_id);

-- Add organization_id to feeding_program table
ALTER TABLE public.feeding_program 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.feeding_program SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.feeding_program ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_feeding_program_organization_id ON public.feeding_program(organization_id);

-- Add organization_id to kipawa_sato table
ALTER TABLE public.kipawa_sato 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.kipawa_sato SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.kipawa_sato ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_kipawa_sato_organization_id ON public.kipawa_sato(organization_id);

-- Add organization_id to self_empowerment table
ALTER TABLE public.self_empowerment 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.self_empowerment SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.self_empowerment ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_self_empowerment_organization_id ON public.self_empowerment(organization_id);

-- Add organization_id to family_adoption table
ALTER TABLE public.family_adoption 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.family_adoption SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.family_adoption ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_family_adoption_organization_id ON public.family_adoption(organization_id);

-- Add organization_id to support_groups table
ALTER TABLE public.support_groups 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.support_groups SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.support_groups ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_support_groups_organization_id ON public.support_groups(organization_id);

-- Add organization_id to activity_reports table
ALTER TABLE public.activity_reports 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.activity_reports SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.activity_reports ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_activity_reports_organization_id ON public.activity_reports(organization_id);

-- Add organization_id to program_reports table
ALTER TABLE public.program_reports 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.program_reports SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.program_reports ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_program_reports_organization_id ON public.program_reports(organization_id);

-- Add organization_id to home_visit_reports table
ALTER TABLE public.home_visit_reports 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.home_visit_reports SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.home_visit_reports ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_home_visit_reports_organization_id ON public.home_visit_reports(organization_id);

-- Add organization_id to school_visit_reports table
ALTER TABLE public.school_visit_reports 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.school_visit_reports SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.school_visit_reports ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_school_visit_reports_organization_id ON public.school_visit_reports(organization_id);

-- Add organization_id to business_visit_reports table
ALTER TABLE public.business_visit_reports 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.business_visit_reports SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.business_visit_reports ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_business_visit_reports_organization_id ON public.business_visit_reports(organization_id);

-- Add organization_id to settings table
ALTER TABLE public.settings 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.settings SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE public.settings ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_settings_organization_id ON public.settings(organization_id);

-- Add organization_id to profiles table (for user's primary org context)
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL 
DEFAULT 'a0000000-0000-0000-0000-000000000001';

UPDATE public.profiles SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);