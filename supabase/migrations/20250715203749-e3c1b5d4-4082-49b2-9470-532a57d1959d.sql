-- Create enum types for dropdowns
CREATE TYPE residence_type AS ENUM ('Kibera', 'Kawangware', 'Diaspora', 'Outside Nairobi');
CREATE TYPE academic_level_type AS ENUM ('Pre Primary', 'Lower Primary', 'Upper Primary', 'Junior Secondary', 'Secondary School', 'Tertiary', 'Special School', 'Junior School');
CREATE TYPE gender_type AS ENUM ('Male', 'Female');
CREATE TYPE parental_status_type AS ENUM ('Both alive', 'Both deceased', 'Partial');
CREATE TYPE feeding_type AS ENUM ('Kawangware Lunch Hour', 'Kibera Early Dinner');
CREATE TYPE talent_category_type AS ENUM ('Music', 'Dance', 'Poetry', 'Art & Craft', 'Sport', 'Boardgames');
CREATE TYPE specific_skill_type AS ENUM ('Singing', 'Spoken Word', 'Drawing', 'Instruments', 'Football', 'Basketball', 'Chess', 'Fashion', 'Modern', 'Traditional');
CREATE TYPE family_category_type AS ENUM ('Guardian Ration', 'Home Based Care');
CREATE TYPE sponsor_type AS ENUM ('NSP-AID', 'Donation');
CREATE TYPE amount_status_type AS ENUM ('Loan', 'Grant');
CREATE TYPE program_type AS ENUM ('Education', 'Kibera Early Dinner', 'Kawangware Lunch Hour', 'Kipawa Sato', 'Self-Empowerment', 'Support Groups');

-- Update existing children table to match Education requirements
ALTER TABLE children 
ADD COLUMN residence residence_type,
ADD COLUMN gender_enum gender_type,
ADD COLUMN academic_level academic_level_type,
ADD COLUMN institution_name TEXT,
ADD COLUMN grade TEXT,
ADD COLUMN parental_status parental_status_type,
ADD COLUMN relation TEXT,
ADD COLUMN contact TEXT,
ADD COLUMN special_condition TEXT;

-- Update existing children table to use enum instead of text for gender
UPDATE children SET gender_enum = gender::gender_type WHERE gender IS NOT NULL;
ALTER TABLE children DROP COLUMN gender;
ALTER TABLE children RENAME COLUMN gender_enum TO gender;

-- Create Feeding Program table
CREATE TABLE feeding_program (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gender gender_type,
  type feeding_type,
  academic_level academic_level_type,
  grade TEXT,
  contact TEXT,
  education_sponsorship BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Kipawa Sato table
CREATE TABLE kipawa_sato (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender gender_type,
  age INTEGER,
  academic_level academic_level_type,
  location residence_type,
  talent_category talent_category_type,
  specific_skill specific_skill_type,
  year_enrolled INTEGER,
  coach_mentor_name TEXT,
  awards_recognition TEXT,
  school_support_given BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Family Adoption table
CREATE TABLE family_adoption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  known_name TEXT NOT NULL,
  actual_name TEXT,
  gender gender_type,
  residence residence_type,
  category family_category_type,
  no_of_beneficiaries INTEGER,
  sponsor sponsor_type,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Self-Empowerment table
CREATE TABLE self_empowerment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id TEXT,
  full_name TEXT NOT NULL,
  gender gender_type,
  contact TEXT,
  residence residence_type,
  business_name TEXT,
  type_of_business TEXT,
  support_status TEXT,
  start_date DATE,
  business_location TEXT,
  amount_requested DECIMAL(10,2),
  amount_approved DECIMAL(10,2),
  amount_status amount_status_type,
  current_status TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Support Groups table
CREATE TABLE support_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  meeting_schedule TEXT,
  facilitator TEXT,
  member_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Home Visit Reports table
CREATE TABLE home_visit_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_date DATE NOT NULL,
  staff TEXT NOT NULL,
  location residence_type,
  student_id UUID,
  reason_for_visit TEXT,
  observation_findings TEXT NOT NULL,
  challenges_identified TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create School Visit Reports table
CREATE TABLE school_visit_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_date DATE NOT NULL,
  staff TEXT NOT NULL,
  location residence_type,
  school TEXT NOT NULL,
  reason_for_visit TEXT,
  observation_findings TEXT NOT NULL,
  challenges_identified TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Program Reports table
CREATE TABLE program_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program program_type NOT NULL,
  reporting_date DATE NOT NULL,
  staff TEXT NOT NULL,
  executive_summary TEXT NOT NULL,
  beneficiary_impact TEXT NOT NULL,
  challenges TEXT NOT NULL,
  proposed_recommendations TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Activity Reports table
CREATE TABLE activity_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program program_type NOT NULL,
  reporting_date DATE NOT NULL,
  staff TEXT NOT NULL,
  executive_summary TEXT NOT NULL,
  beneficiary_impact TEXT NOT NULL,
  challenges TEXT NOT NULL,
  proposed_recommendations TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE feeding_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE kipawa_sato ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_adoption ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_empowerment ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_visit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_visit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
-- Feeding Program policies
CREATE POLICY "Authenticated users can view feeding program" ON feeding_program FOR SELECT USING (true);
CREATE POLICY "Coordinators and admins can manage feeding program" ON feeding_program FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role]));

-- Kipawa Sato policies
CREATE POLICY "Authenticated users can view kipawa sato" ON kipawa_sato FOR SELECT USING (true);
CREATE POLICY "Coordinators and admins can manage kipawa sato" ON kipawa_sato FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role]));

-- Family Adoption policies
CREATE POLICY "Authenticated users can view family adoption" ON family_adoption FOR SELECT USING (true);
CREATE POLICY "Coordinators and admins can manage family adoption" ON family_adoption FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role]));

-- Self-Empowerment policies
CREATE POLICY "Authenticated users can view self empowerment" ON self_empowerment FOR SELECT USING (true);
CREATE POLICY "Coordinators and admins can manage self empowerment" ON self_empowerment FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role]));

-- Support Groups policies
CREATE POLICY "Authenticated users can view support groups" ON support_groups FOR SELECT USING (true);
CREATE POLICY "Coordinators and admins can manage support groups" ON support_groups FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role]));

-- Report policies
CREATE POLICY "Authenticated users can view home visit reports" ON home_visit_reports FOR SELECT USING (true);
CREATE POLICY "Coordinators and admins can manage home visit reports" ON home_visit_reports FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role]));

CREATE POLICY "Authenticated users can view school visit reports" ON school_visit_reports FOR SELECT USING (true);
CREATE POLICY "Coordinators and admins can manage school visit reports" ON school_visit_reports FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role]));

CREATE POLICY "Authenticated users can view program reports" ON program_reports FOR SELECT USING (true);
CREATE POLICY "Coordinators and admins can manage program reports" ON program_reports FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role]));

CREATE POLICY "Authenticated users can view activity reports" ON activity_reports FOR SELECT USING (true);
CREATE POLICY "Coordinators and admins can manage activity reports" ON activity_reports FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role]));

-- Add triggers for updated_at columns
CREATE TRIGGER update_feeding_program_updated_at BEFORE UPDATE ON feeding_program FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kipawa_sato_updated_at BEFORE UPDATE ON kipawa_sato FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_adoption_updated_at BEFORE UPDATE ON family_adoption FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_self_empowerment_updated_at BEFORE UPDATE ON self_empowerment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_groups_updated_at BEFORE UPDATE ON support_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_home_visit_reports_updated_at BEFORE UPDATE ON home_visit_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_school_visit_reports_updated_at BEFORE UPDATE ON school_visit_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_program_reports_updated_at BEFORE UPDATE ON program_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activity_reports_updated_at BEFORE UPDATE ON activity_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();