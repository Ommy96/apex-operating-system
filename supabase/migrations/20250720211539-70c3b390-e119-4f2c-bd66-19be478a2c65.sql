-- Update user_role enum to new structure
ALTER TYPE user_role RENAME TO user_role_old;

-- Create new user_role enum with desired roles
CREATE TYPE user_role AS ENUM ('admin', 'management', 'staff');

-- Update profiles table to use new enum
ALTER TABLE profiles 
ALTER COLUMN role DROP DEFAULT,
ALTER COLUMN role TYPE user_role USING 
  CASE 
    WHEN role::text = 'admin' THEN 'admin'::user_role
    WHEN role::text IN ('coordinator', 'volunteer') THEN 'management'::user_role
    ELSE 'staff'::user_role
  END,
ALTER COLUMN role SET DEFAULT 'staff'::user_role;

-- Drop old enum
DROP TYPE user_role_old;

-- Update RLS policies based on new role structure

-- Children table policies
DROP POLICY IF EXISTS "Coordinators and admins can insert children" ON children;
DROP POLICY IF EXISTS "Coordinators and admins can update children" ON children;

CREATE POLICY "Admins can insert children" ON children FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update children" ON children FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- Activities table policies  
DROP POLICY IF EXISTS "Coordinators and admins can manage activities" ON activities;
CREATE POLICY "Admins can manage activities" ON activities FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Child programs policies
DROP POLICY IF EXISTS "Coordinators and admins can manage child programs" ON child_programs;
CREATE POLICY "Admins can manage child programs" ON child_programs FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Documents policies
DROP POLICY IF EXISTS "Coordinators and admins can manage documents" ON documents;
CREATE POLICY "Admins can manage documents" ON documents FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Visits policies
DROP POLICY IF EXISTS "Coordinators and admins can manage visits" ON visits;
CREATE POLICY "Admins can manage visits" ON visits FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Activity reports policies
DROP POLICY IF EXISTS "Coordinators and admins can manage activity reports" ON activity_reports;
CREATE POLICY "Admins can manage activity reports" ON activity_reports FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Staff can create activity reports" ON activity_reports FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'staff');

-- Program reports policies
DROP POLICY IF EXISTS "Coordinators and admins can manage program reports" ON program_reports;
CREATE POLICY "Admins can manage program reports" ON program_reports FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Staff can create program reports" ON program_reports FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'staff');

-- Home visit reports policies
DROP POLICY IF EXISTS "Coordinators and admins can manage home visit reports" ON home_visit_reports;
CREATE POLICY "Admins can manage home visit reports" ON home_visit_reports FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Staff can create home visit reports" ON home_visit_reports FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'staff');

-- School visit reports policies
DROP POLICY IF EXISTS "Coordinators and admins can manage school visit reports" ON school_visit_reports;
CREATE POLICY "Admins can manage school visit reports" ON school_visit_reports FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Staff can create school visit reports" ON school_visit_reports FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'staff');

-- Self empowerment policies
DROP POLICY IF EXISTS "Coordinators and admins can manage self empowerment" ON self_empowerment;
CREATE POLICY "Admins can manage self empowerment" ON self_empowerment FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Loan repayments policies
DROP POLICY IF EXISTS "Coordinators and admins can manage loan repayments" ON loan_repayments;
CREATE POLICY "Admins can manage loan repayments" ON loan_repayments FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Family adoption policies
DROP POLICY IF EXISTS "Coordinators and admins can manage family adoption" ON family_adoption;
CREATE POLICY "Admins can manage family adoption" ON family_adoption FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Feeding program policies
DROP POLICY IF EXISTS "Coordinators and admins can manage feeding program" ON feeding_program;
CREATE POLICY "Admins can manage feeding program" ON feeding_program FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Kipawa sato policies
DROP POLICY IF EXISTS "Coordinators and admins can manage kipawa sato" ON kipawa_sato;
CREATE POLICY "Admins can manage kipawa sato" ON kipawa_sato FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Support groups policies
DROP POLICY IF EXISTS "Coordinators and admins can manage support groups" ON support_groups;
CREATE POLICY "Admins can manage support groups" ON support_groups FOR ALL USING (get_user_role(auth.uid()) = 'admin');