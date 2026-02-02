-- =====================================================
-- PHASE 1: UNIFIED BENEFICIARY SYSTEM DATABASE SCHEMA
-- This preserves existing children data and adds new structure
-- =====================================================

-- Create enum for beneficiary types
CREATE TYPE public.beneficiary_type AS ENUM ('student', 'adult', 'group');

-- Create enum for guardian type
CREATE TYPE public.guardian_type AS ENUM ('father', 'mother', 'other');

-- Create enum for HIV status
CREATE TYPE public.hiv_status_type AS ENUM ('positive', 'negative', 'unknown');

-- =====================================================
-- GUARDIANS TABLE - Standalone table for guardian records
-- =====================================================
CREATE TABLE public.guardians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  guardian_type public.guardian_type NOT NULL,
  full_name TEXT NOT NULL,
  national_id TEXT,
  age INTEGER,
  phone TEXT,
  email TEXT,
  is_alive BOOLEAN DEFAULT true,
  date_of_death DATE,
  source_of_income TEXT,
  employment_type TEXT, -- 'employed', 'self_employed', 'unemployed'
  employment_details TEXT,
  address TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view guardians in their organization"
  ON public.guardians FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create guardians in their organization"
  ON public.guardians FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update guardians in their organization"
  ON public.guardians FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete guardians in their organization"
  ON public.guardians FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Indexes
CREATE INDEX idx_guardians_organization ON public.guardians(organization_id);
CREATE INDEX idx_guardians_type ON public.guardians(guardian_type);
CREATE INDEX idx_guardians_name ON public.guardians(full_name);

-- =====================================================
-- UNIFIED BENEFICIARIES TABLE
-- =====================================================
CREATE TABLE public.beneficiaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beneficiary_type public.beneficiary_type NOT NULL,
  
  -- Common fields
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  year_enrolled INTEGER,
  inactive_date DATE,
  inactive_reason TEXT,
  
  -- Personal details (for individuals)
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender public.gender_type,
  religion TEXT,
  hobbies TEXT,
  future_ambition TEXT,
  photo_url TEXT,
  
  -- Residence details
  county TEXT,
  sub_county TEXT,
  location TEXT,
  estate_village TEXT,
  home_county TEXT,
  
  -- Medical Information (students)
  hiv_status public.hiv_status_type,
  hiv_positive_since INTEGER, -- year
  has_special_needs BOOLEAN DEFAULT false,
  special_needs_details TEXT,
  other_medical_conditions TEXT,
  
  -- Academic Information (students)
  academic_level public.academic_level_type,
  institution_name TEXT,
  grade TEXT,
  course_name TEXT,
  student_id_number TEXT,
  
  -- Adult-specific fields
  source_of_income TEXT,
  amount_given DECIMAL(12,2),
  
  -- Group-specific fields
  group_name TEXT,
  member_count INTEGER,
  leader_name TEXT,
  leader_phone TEXT,
  group_activities TEXT[], -- array of activities
  group_schedule TEXT, -- when they meet
  
  -- Links to legacy children table for migration
  legacy_child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  
  -- Metadata
  background_narrative TEXT,
  background_image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beneficiaries in their organization"
  ON public.beneficiaries FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create beneficiaries in their organization"
  ON public.beneficiaries FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update beneficiaries in their organization"
  ON public.beneficiaries FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete beneficiaries in their organization"
  ON public.beneficiaries FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Indexes
CREATE INDEX idx_beneficiaries_organization ON public.beneficiaries(organization_id);
CREATE INDEX idx_beneficiaries_type ON public.beneficiaries(beneficiary_type);
CREATE INDEX idx_beneficiaries_status ON public.beneficiaries(status);
CREATE INDEX idx_beneficiaries_name ON public.beneficiaries(display_name);
CREATE INDEX idx_beneficiaries_legacy ON public.beneficiaries(legacy_child_id);

-- =====================================================
-- BENEFICIARY GUARDIANS - Junction table linking beneficiaries to guardians
-- =====================================================
CREATE TABLE public.beneficiary_guardians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- 'father', 'mother', 'other'
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(beneficiary_id, guardian_id)
);

-- Enable RLS
ALTER TABLE public.beneficiary_guardians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beneficiary_guardians"
  ON public.beneficiary_guardians FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.beneficiaries b 
      WHERE b.id = beneficiary_id 
      AND public.user_belongs_to_org(auth.uid(), b.organization_id)
    )
  );

CREATE POLICY "Users can manage beneficiary_guardians"
  ON public.beneficiary_guardians FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.beneficiaries b 
      WHERE b.id = beneficiary_id 
      AND public.user_belongs_to_org(auth.uid(), b.organization_id)
    )
  );

CREATE INDEX idx_beneficiary_guardians_beneficiary ON public.beneficiary_guardians(beneficiary_id);
CREATE INDEX idx_beneficiary_guardians_guardian ON public.beneficiary_guardians(guardian_id);

-- =====================================================
-- BENEFICIARY SIBLINGS - Link students to each other as siblings
-- =====================================================
CREATE TABLE public.beneficiary_siblings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  sibling_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- 'brother', 'sister', 'cousin'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(beneficiary_id, sibling_id),
  CHECK (beneficiary_id != sibling_id)
);

-- Enable RLS
ALTER TABLE public.beneficiary_siblings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beneficiary_siblings"
  ON public.beneficiary_siblings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.beneficiaries b 
      WHERE b.id = beneficiary_id 
      AND public.user_belongs_to_org(auth.uid(), b.organization_id)
    )
  );

CREATE POLICY "Users can manage beneficiary_siblings"
  ON public.beneficiary_siblings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.beneficiaries b 
      WHERE b.id = beneficiary_id 
      AND public.user_belongs_to_org(auth.uid(), b.organization_id)
    )
  );

CREATE INDEX idx_beneficiary_siblings_beneficiary ON public.beneficiary_siblings(beneficiary_id);
CREATE INDEX idx_beneficiary_siblings_sibling ON public.beneficiary_siblings(sibling_id);

-- =====================================================
-- BENEFICIARY DONORS - Multiple donors per beneficiary
-- =====================================================
CREATE TABLE public.beneficiary_donors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  donor_name TEXT NOT NULL,
  amount_received DECIMAL(12,2),
  donation_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beneficiary_donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beneficiary_donors in their organization"
  ON public.beneficiary_donors FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create beneficiary_donors in their organization"
  ON public.beneficiary_donors FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update beneficiary_donors in their organization"
  ON public.beneficiary_donors FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete beneficiary_donors in their organization"
  ON public.beneficiary_donors FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX idx_beneficiary_donors_beneficiary ON public.beneficiary_donors(beneficiary_id);
CREATE INDEX idx_beneficiary_donors_organization ON public.beneficiary_donors(organization_id);

-- =====================================================
-- ADULT-STUDENT DEPENDANTS - Link adults to students they depend
-- =====================================================
CREATE TABLE public.adult_dependants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adult_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(adult_id, student_id),
  CHECK (adult_id != student_id)
);

-- Enable RLS
ALTER TABLE public.adult_dependants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view adult_dependants"
  ON public.adult_dependants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.beneficiaries b 
      WHERE b.id = adult_id 
      AND public.user_belongs_to_org(auth.uid(), b.organization_id)
    )
  );

CREATE POLICY "Users can manage adult_dependants"
  ON public.adult_dependants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.beneficiaries b 
      WHERE b.id = adult_id 
      AND public.user_belongs_to_org(auth.uid(), b.organization_id)
    )
  );

CREATE INDEX idx_adult_dependants_adult ON public.adult_dependants(adult_id);
CREATE INDEX idx_adult_dependants_student ON public.adult_dependants(student_id);

-- =====================================================
-- BENEFICIARY SERVICES - Link beneficiaries to programs/projects
-- =====================================================
CREATE TABLE public.beneficiary_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_name TEXT,
  enrolled_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beneficiary_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beneficiary_services in their organization"
  ON public.beneficiary_services FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create beneficiary_services in their organization"
  ON public.beneficiary_services FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update beneficiary_services in their organization"
  ON public.beneficiary_services FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete beneficiary_services in their organization"
  ON public.beneficiary_services FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX idx_beneficiary_services_beneficiary ON public.beneficiary_services(beneficiary_id);
CREATE INDEX idx_beneficiary_services_program ON public.beneficiary_services(program_id);
CREATE INDEX idx_beneficiary_services_organization ON public.beneficiary_services(organization_id);

-- =====================================================
-- BENEFICIARY VISITATIONS - Home/School/Hospital/Business visits
-- =====================================================
CREATE TABLE public.beneficiary_visitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  visit_type TEXT NOT NULL, -- 'home', 'school', 'hospital', 'business'
  visit_date DATE NOT NULL,
  location TEXT,
  staff_name TEXT,
  reason_for_visit TEXT,
  observation_findings TEXT,
  challenges_identified TEXT,
  recommendations TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beneficiary_visitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beneficiary_visitations in their organization"
  ON public.beneficiary_visitations FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create beneficiary_visitations in their organization"
  ON public.beneficiary_visitations FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update beneficiary_visitations in their organization"
  ON public.beneficiary_visitations FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete beneficiary_visitations in their organization"
  ON public.beneficiary_visitations FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX idx_beneficiary_visitations_beneficiary ON public.beneficiary_visitations(beneficiary_id);
CREATE INDEX idx_beneficiary_visitations_type ON public.beneficiary_visitations(visit_type);
CREATE INDEX idx_beneficiary_visitations_organization ON public.beneficiary_visitations(organization_id);

-- =====================================================
-- BENEFICIARY ACADEMICS - Termly performance records
-- =====================================================
CREATE TABLE public.beneficiary_academics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  term TEXT NOT NULL, -- 'Term 1', 'Term 2', 'Term 3'
  overall_grade TEXT,
  position INTEGER,
  total_marks DECIMAL(5,2),
  out_of DECIMAL(5,2),
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(beneficiary_id, academic_year, term)
);

-- Enable RLS
ALTER TABLE public.beneficiary_academics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beneficiary_academics in their organization"
  ON public.beneficiary_academics FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create beneficiary_academics in their organization"
  ON public.beneficiary_academics FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update beneficiary_academics in their organization"
  ON public.beneficiary_academics FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete beneficiary_academics in their organization"
  ON public.beneficiary_academics FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX idx_beneficiary_academics_beneficiary ON public.beneficiary_academics(beneficiary_id);
CREATE INDEX idx_beneficiary_academics_year ON public.beneficiary_academics(academic_year);
CREATE INDEX idx_beneficiary_academics_organization ON public.beneficiary_academics(organization_id);

-- =====================================================
-- BENEFICIARY UPLOADS - Documents for each beneficiary
-- =====================================================
CREATE TABLE public.beneficiary_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT, -- 'consent_form', 'intake_form', 'appreciation_letter', 'other'
  description TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beneficiary_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beneficiary_uploads in their organization"
  ON public.beneficiary_uploads FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create beneficiary_uploads in their organization"
  ON public.beneficiary_uploads FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete beneficiary_uploads in their organization"
  ON public.beneficiary_uploads FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX idx_beneficiary_uploads_beneficiary ON public.beneficiary_uploads(beneficiary_id);
CREATE INDEX idx_beneficiary_uploads_organization ON public.beneficiary_uploads(organization_id);

-- =====================================================
-- PROJECTS TABLE - Projects under programs
-- =====================================================
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects in their organization"
  ON public.projects FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create projects in their organization"
  ON public.projects FOR INSERT
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update projects in their organization"
  ON public.projects FOR UPDATE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete projects in their organization"
  ON public.projects FOR DELETE
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE INDEX idx_projects_organization ON public.projects(organization_id);
CREATE INDEX idx_projects_program ON public.projects(program_id);

-- =====================================================
-- Add updated_at triggers
-- =====================================================
CREATE TRIGGER update_guardians_updated_at
  BEFORE UPDATE ON public.guardians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beneficiaries_updated_at
  BEFORE UPDATE ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beneficiary_donors_updated_at
  BEFORE UPDATE ON public.beneficiary_donors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beneficiary_services_updated_at
  BEFORE UPDATE ON public.beneficiary_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beneficiary_visitations_updated_at
  BEFORE UPDATE ON public.beneficiary_visitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beneficiary_academics_updated_at
  BEFORE UPDATE ON public.beneficiary_academics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();