-- First drop all policies that depend on the old enum
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Coordinators and admins can insert children" ON children;
DROP POLICY IF EXISTS "Coordinators and admins can update children" ON children;
DROP POLICY IF EXISTS "Admins can delete children" ON children;
DROP POLICY IF EXISTS "Admins can manage programs" ON programs;
DROP POLICY IF EXISTS "Coordinators and admins can manage child programs" ON child_programs;
DROP POLICY IF EXISTS "Coordinators and admins can manage activities" ON activities;
DROP POLICY IF EXISTS "Coordinators and admins can manage visits" ON visits;
DROP POLICY IF EXISTS "Coordinators and admins can manage documents" ON documents;
DROP POLICY IF EXISTS "Coordinators can update child photos" ON storage.objects;
DROP POLICY IF EXISTS "Coordinators can manage documents" ON storage.objects;
DROP POLICY IF EXISTS "Coordinators and admins can manage feeding program" ON feeding_program;
DROP POLICY IF EXISTS "Coordinators and admins can manage kipawa sato" ON kipawa_sato;
DROP POLICY IF EXISTS "Coordinators and admins can manage family adoption" ON family_adoption;
DROP POLICY IF EXISTS "Coordinators and admins can manage self empowerment" ON self_empowerment;
DROP POLICY IF EXISTS "Coordinators and admins can manage support groups" ON support_groups;
DROP POLICY IF EXISTS "Coordinators and admins can manage home visit reports" ON home_visit_reports;
DROP POLICY IF EXISTS "Coordinators and admins can manage school visit reports" ON school_visit_reports;
DROP POLICY IF EXISTS "Coordinators and admins can manage program reports" ON program_reports;
DROP POLICY IF EXISTS "Coordinators and admins can manage activity reports" ON activity_reports;
DROP POLICY IF EXISTS "Coordinators and admins can manage loan repayments" ON loan_repayments;

-- Drop the get_user_role function that depends on the old enum
DROP FUNCTION IF EXISTS get_user_role(uuid);

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

-- Recreate the get_user_role function with new enum
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT role FROM public.profiles WHERE profiles.user_id = $1;
$function$;

-- Drop old enum
DROP TYPE user_role_old CASCADE;

-- Recreate all policies with new role structure

-- Profiles policies
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Children table policies
CREATE POLICY "Admins can insert children" ON children FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update children" ON children FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete children" ON children FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- Programs policies
CREATE POLICY "Admins can manage programs" ON programs FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Child programs policies
CREATE POLICY "Admins can manage child programs" ON child_programs FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Activities policies  
CREATE POLICY "Admins can manage activities" ON activities FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Visits policies
CREATE POLICY "Admins can manage visits" ON visits FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Documents policies
CREATE POLICY "Admins can manage documents" ON documents FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Storage policies for child photos
CREATE POLICY "Admins can update child photos" ON storage.objects 
FOR UPDATE USING (bucket_id = 'child-photos' AND get_user_role(auth.uid()) = 'admin');

-- Storage policies for documents
CREATE POLICY "Admins can manage documents" ON storage.objects 
FOR ALL USING (bucket_id = 'documents' AND get_user_role(auth.uid()) = 'admin');

-- Program-specific policies
CREATE POLICY "Admins can manage feeding program" ON feeding_program FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage kipawa sato" ON kipawa_sato FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage family adoption" ON family_adoption FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage self empowerment" ON self_empowerment FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can manage support groups" ON support_groups FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Report policies - Admins can do everything, Staff can only create
CREATE POLICY "Admins can manage home visit reports" ON home_visit_reports FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Staff can create home visit reports" ON home_visit_reports FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'staff');

CREATE POLICY "Admins can manage school visit reports" ON school_visit_reports FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Staff can create school visit reports" ON school_visit_reports FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'staff');

CREATE POLICY "Admins can manage program reports" ON program_reports FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Staff can create program reports" ON program_reports FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'staff');

CREATE POLICY "Admins can manage activity reports" ON activity_reports FOR ALL USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Staff can create activity reports" ON activity_reports FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'staff');

CREATE POLICY "Admins can manage loan repayments" ON loan_repayments FOR ALL USING (get_user_role(auth.uid()) = 'admin');