
-- Phase 3: Update RLS policies for organization-based multi-tenancy
-- Drop existing policies and create new organization-scoped ones

-- ============================================
-- CHILDREN TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view children" ON public.children;
DROP POLICY IF EXISTS "Users can insert children" ON public.children;
DROP POLICY IF EXISTS "Users can update children" ON public.children;
DROP POLICY IF EXISTS "Users can delete children" ON public.children;
DROP POLICY IF EXISTS "Authenticated users can view children" ON public.children;
DROP POLICY IF EXISTS "Authenticated users can insert children" ON public.children;
DROP POLICY IF EXISTS "Authenticated users can update children" ON public.children;
DROP POLICY IF EXISTS "Authenticated users can delete children" ON public.children;

CREATE POLICY "Users can view children in their organization"
ON public.children FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert children in their organization"
ON public.children FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update children in their organization"
ON public.children FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete children in their organization"
ON public.children FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id) 
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- PROGRAMS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view programs" ON public.programs;
DROP POLICY IF EXISTS "Users can insert programs" ON public.programs;
DROP POLICY IF EXISTS "Users can update programs" ON public.programs;
DROP POLICY IF EXISTS "Users can delete programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can view programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can insert programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can update programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can delete programs" ON public.programs;

CREATE POLICY "Users can view programs in their organization"
ON public.programs FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can insert programs in their organization"
ON public.programs FOR INSERT
TO authenticated
WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner', 'management')
);

CREATE POLICY "Admins can update programs in their organization"
ON public.programs FOR UPDATE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner', 'management')
);

CREATE POLICY "Admins can delete programs in their organization"
ON public.programs FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- SPONSORS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Users can insert sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Users can update sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Users can delete sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Authenticated users can view sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Authenticated users can insert sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Authenticated users can update sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Authenticated users can delete sponsors" ON public.sponsors;

CREATE POLICY "Users can view sponsors in their organization"
ON public.sponsors FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert sponsors in their organization"
ON public.sponsors FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update sponsors in their organization"
ON public.sponsors FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete sponsors in their organization"
ON public.sponsors FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- ALUMNI TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view alumni" ON public.alumni;
DROP POLICY IF EXISTS "Users can insert alumni" ON public.alumni;
DROP POLICY IF EXISTS "Users can update alumni" ON public.alumni;
DROP POLICY IF EXISTS "Users can delete alumni" ON public.alumni;
DROP POLICY IF EXISTS "Authenticated users can view alumni" ON public.alumni;
DROP POLICY IF EXISTS "Authenticated users can insert alumni" ON public.alumni;
DROP POLICY IF EXISTS "Authenticated users can update alumni" ON public.alumni;
DROP POLICY IF EXISTS "Authenticated users can delete alumni" ON public.alumni;

CREATE POLICY "Users can view alumni in their organization"
ON public.alumni FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert alumni in their organization"
ON public.alumni FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update alumni in their organization"
ON public.alumni FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete alumni in their organization"
ON public.alumni FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- MEDICAL_RECORDS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Users can insert medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Users can update medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Users can delete medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Authenticated users can view medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Authenticated users can insert medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Authenticated users can update medical_records" ON public.medical_records;
DROP POLICY IF EXISTS "Authenticated users can delete medical_records" ON public.medical_records;

CREATE POLICY "Users can view medical_records in their organization"
ON public.medical_records FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert medical_records in their organization"
ON public.medical_records FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update medical_records in their organization"
ON public.medical_records FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete medical_records in their organization"
ON public.medical_records FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- FEEDING_PROGRAM TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view feeding_program" ON public.feeding_program;
DROP POLICY IF EXISTS "Users can insert feeding_program" ON public.feeding_program;
DROP POLICY IF EXISTS "Users can update feeding_program" ON public.feeding_program;
DROP POLICY IF EXISTS "Users can delete feeding_program" ON public.feeding_program;
DROP POLICY IF EXISTS "Authenticated users can view feeding_program" ON public.feeding_program;
DROP POLICY IF EXISTS "Authenticated users can insert feeding_program" ON public.feeding_program;
DROP POLICY IF EXISTS "Authenticated users can update feeding_program" ON public.feeding_program;
DROP POLICY IF EXISTS "Authenticated users can delete feeding_program" ON public.feeding_program;

CREATE POLICY "Users can view feeding_program in their organization"
ON public.feeding_program FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert feeding_program in their organization"
ON public.feeding_program FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update feeding_program in their organization"
ON public.feeding_program FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete feeding_program in their organization"
ON public.feeding_program FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- KIPAWA_SATO TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view kipawa_sato" ON public.kipawa_sato;
DROP POLICY IF EXISTS "Users can insert kipawa_sato" ON public.kipawa_sato;
DROP POLICY IF EXISTS "Users can update kipawa_sato" ON public.kipawa_sato;
DROP POLICY IF EXISTS "Users can delete kipawa_sato" ON public.kipawa_sato;
DROP POLICY IF EXISTS "Authenticated users can view kipawa_sato" ON public.kipawa_sato;
DROP POLICY IF EXISTS "Authenticated users can insert kipawa_sato" ON public.kipawa_sato;
DROP POLICY IF EXISTS "Authenticated users can update kipawa_sato" ON public.kipawa_sato;
DROP POLICY IF EXISTS "Authenticated users can delete kipawa_sato" ON public.kipawa_sato;

CREATE POLICY "Users can view kipawa_sato in their organization"
ON public.kipawa_sato FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert kipawa_sato in their organization"
ON public.kipawa_sato FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update kipawa_sato in their organization"
ON public.kipawa_sato FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete kipawa_sato in their organization"
ON public.kipawa_sato FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- SELF_EMPOWERMENT TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view self_empowerment" ON public.self_empowerment;
DROP POLICY IF EXISTS "Users can insert self_empowerment" ON public.self_empowerment;
DROP POLICY IF EXISTS "Users can update self_empowerment" ON public.self_empowerment;
DROP POLICY IF EXISTS "Users can delete self_empowerment" ON public.self_empowerment;
DROP POLICY IF EXISTS "Authenticated users can view self_empowerment" ON public.self_empowerment;
DROP POLICY IF EXISTS "Authenticated users can insert self_empowerment" ON public.self_empowerment;
DROP POLICY IF EXISTS "Authenticated users can update self_empowerment" ON public.self_empowerment;
DROP POLICY IF EXISTS "Authenticated users can delete self_empowerment" ON public.self_empowerment;

CREATE POLICY "Users can view self_empowerment in their organization"
ON public.self_empowerment FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert self_empowerment in their organization"
ON public.self_empowerment FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update self_empowerment in their organization"
ON public.self_empowerment FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete self_empowerment in their organization"
ON public.self_empowerment FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- FAMILY_ADOPTION TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view family_adoption" ON public.family_adoption;
DROP POLICY IF EXISTS "Users can insert family_adoption" ON public.family_adoption;
DROP POLICY IF EXISTS "Users can update family_adoption" ON public.family_adoption;
DROP POLICY IF EXISTS "Users can delete family_adoption" ON public.family_adoption;
DROP POLICY IF EXISTS "Authenticated users can view family_adoption" ON public.family_adoption;
DROP POLICY IF EXISTS "Authenticated users can insert family_adoption" ON public.family_adoption;
DROP POLICY IF EXISTS "Authenticated users can update family_adoption" ON public.family_adoption;
DROP POLICY IF EXISTS "Authenticated users can delete family_adoption" ON public.family_adoption;

CREATE POLICY "Users can view family_adoption in their organization"
ON public.family_adoption FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert family_adoption in their organization"
ON public.family_adoption FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update family_adoption in their organization"
ON public.family_adoption FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete family_adoption in their organization"
ON public.family_adoption FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- SUPPORT_GROUPS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view support_groups" ON public.support_groups;
DROP POLICY IF EXISTS "Users can insert support_groups" ON public.support_groups;
DROP POLICY IF EXISTS "Users can update support_groups" ON public.support_groups;
DROP POLICY IF EXISTS "Users can delete support_groups" ON public.support_groups;
DROP POLICY IF EXISTS "Authenticated users can view support_groups" ON public.support_groups;
DROP POLICY IF EXISTS "Authenticated users can insert support_groups" ON public.support_groups;
DROP POLICY IF EXISTS "Authenticated users can update support_groups" ON public.support_groups;
DROP POLICY IF EXISTS "Authenticated users can delete support_groups" ON public.support_groups;

CREATE POLICY "Users can view support_groups in their organization"
ON public.support_groups FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert support_groups in their organization"
ON public.support_groups FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update support_groups in their organization"
ON public.support_groups FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete support_groups in their organization"
ON public.support_groups FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- ACTIVITY_REPORTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view activity_reports" ON public.activity_reports;
DROP POLICY IF EXISTS "Users can insert activity_reports" ON public.activity_reports;
DROP POLICY IF EXISTS "Users can update activity_reports" ON public.activity_reports;
DROP POLICY IF EXISTS "Users can delete activity_reports" ON public.activity_reports;
DROP POLICY IF EXISTS "Authenticated users can view activity_reports" ON public.activity_reports;
DROP POLICY IF EXISTS "Authenticated users can insert activity_reports" ON public.activity_reports;
DROP POLICY IF EXISTS "Authenticated users can update activity_reports" ON public.activity_reports;
DROP POLICY IF EXISTS "Authenticated users can delete activity_reports" ON public.activity_reports;

CREATE POLICY "Users can view activity_reports in their organization"
ON public.activity_reports FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert activity_reports in their organization"
ON public.activity_reports FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update activity_reports in their organization"
ON public.activity_reports FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete activity_reports in their organization"
ON public.activity_reports FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- PROGRAM_REPORTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view program_reports" ON public.program_reports;
DROP POLICY IF EXISTS "Users can insert program_reports" ON public.program_reports;
DROP POLICY IF EXISTS "Users can update program_reports" ON public.program_reports;
DROP POLICY IF EXISTS "Users can delete program_reports" ON public.program_reports;
DROP POLICY IF EXISTS "Authenticated users can view program_reports" ON public.program_reports;
DROP POLICY IF EXISTS "Authenticated users can insert program_reports" ON public.program_reports;
DROP POLICY IF EXISTS "Authenticated users can update program_reports" ON public.program_reports;
DROP POLICY IF EXISTS "Authenticated users can delete program_reports" ON public.program_reports;

CREATE POLICY "Users can view program_reports in their organization"
ON public.program_reports FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert program_reports in their organization"
ON public.program_reports FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update program_reports in their organization"
ON public.program_reports FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete program_reports in their organization"
ON public.program_reports FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- HOME_VISIT_REPORTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view home_visit_reports" ON public.home_visit_reports;
DROP POLICY IF EXISTS "Users can insert home_visit_reports" ON public.home_visit_reports;
DROP POLICY IF EXISTS "Users can update home_visit_reports" ON public.home_visit_reports;
DROP POLICY IF EXISTS "Users can delete home_visit_reports" ON public.home_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can view home_visit_reports" ON public.home_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can insert home_visit_reports" ON public.home_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can update home_visit_reports" ON public.home_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can delete home_visit_reports" ON public.home_visit_reports;

CREATE POLICY "Users can view home_visit_reports in their organization"
ON public.home_visit_reports FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert home_visit_reports in their organization"
ON public.home_visit_reports FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update home_visit_reports in their organization"
ON public.home_visit_reports FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete home_visit_reports in their organization"
ON public.home_visit_reports FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- SCHOOL_VISIT_REPORTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view school_visit_reports" ON public.school_visit_reports;
DROP POLICY IF EXISTS "Users can insert school_visit_reports" ON public.school_visit_reports;
DROP POLICY IF EXISTS "Users can update school_visit_reports" ON public.school_visit_reports;
DROP POLICY IF EXISTS "Users can delete school_visit_reports" ON public.school_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can view school_visit_reports" ON public.school_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can insert school_visit_reports" ON public.school_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can update school_visit_reports" ON public.school_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can delete school_visit_reports" ON public.school_visit_reports;

CREATE POLICY "Users can view school_visit_reports in their organization"
ON public.school_visit_reports FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert school_visit_reports in their organization"
ON public.school_visit_reports FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update school_visit_reports in their organization"
ON public.school_visit_reports FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete school_visit_reports in their organization"
ON public.school_visit_reports FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- BUSINESS_VISIT_REPORTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view business_visit_reports" ON public.business_visit_reports;
DROP POLICY IF EXISTS "Users can insert business_visit_reports" ON public.business_visit_reports;
DROP POLICY IF EXISTS "Users can update business_visit_reports" ON public.business_visit_reports;
DROP POLICY IF EXISTS "Users can delete business_visit_reports" ON public.business_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can view business_visit_reports" ON public.business_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can insert business_visit_reports" ON public.business_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can update business_visit_reports" ON public.business_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can delete business_visit_reports" ON public.business_visit_reports;

CREATE POLICY "Users can view business_visit_reports in their organization"
ON public.business_visit_reports FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert business_visit_reports in their organization"
ON public.business_visit_reports FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update business_visit_reports in their organization"
ON public.business_visit_reports FOR UPDATE
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete business_visit_reports in their organization"
ON public.business_visit_reports FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- SETTINGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update settings" ON public.settings;
DROP POLICY IF EXISTS "Users can delete settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can delete settings" ON public.settings;

CREATE POLICY "Users can view settings in their organization"
ON public.settings FOR SELECT
TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can insert settings in their organization"
ON public.settings FOR INSERT
TO authenticated
WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

CREATE POLICY "Admins can update settings in their organization"
ON public.settings FOR UPDATE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

CREATE POLICY "Admins can delete settings in their organization"
ON public.settings FOR DELETE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============================================
-- PROFILES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;

CREATE POLICY "Users can view profiles in their organization"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can update profiles in their organization"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);
