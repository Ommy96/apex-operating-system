-- Update RLS policies to restrict staff access to only their own reports

-- Activity Reports: Staff can only view/edit their own reports
DROP POLICY IF EXISTS "Staff can create activity reports" ON activity_reports;
CREATE POLICY "Staff can create and view their own activity reports" 
ON activity_reports 
FOR ALL
USING (
  CASE 
    WHEN get_user_role(auth.uid()) = 'staff' THEN created_by = auth.uid()
    ELSE true
  END
);

-- Home Visit Reports: Staff can only view/edit their own reports  
DROP POLICY IF EXISTS "Staff can create home visit reports" ON home_visit_reports;
CREATE POLICY "Staff can create and view their own home visit reports"
ON home_visit_reports
FOR ALL  
USING (
  CASE
    WHEN get_user_role(auth.uid()) = 'staff' THEN created_by = auth.uid()
    ELSE true
  END
);

-- School Visit Reports: Staff can only view/edit their own reports
DROP POLICY IF EXISTS "Staff can create school visit reports" ON school_visit_reports;
CREATE POLICY "Staff can create and view their own school visit reports"
ON school_visit_reports
FOR ALL
USING (
  CASE
    WHEN get_user_role(auth.uid()) = 'staff' THEN created_by = auth.uid() 
    ELSE true
  END
);

-- Program Reports: Staff can only view/edit their own reports
DROP POLICY IF EXISTS "Staff and admins can create program reports" ON program_reports;
CREATE POLICY "Staff can create and view their own program reports"
ON program_reports
FOR ALL
USING (
  CASE
    WHEN get_user_role(auth.uid()) = 'staff' THEN created_by = auth.uid()
    ELSE get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'management'::user_role])
  END
);

-- Update existing admin policies to be more explicit
DROP POLICY IF EXISTS "Admins can manage activity reports" ON activity_reports;
CREATE POLICY "Admins and management can manage all activity reports"
ON activity_reports
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'management'::user_role]));

DROP POLICY IF EXISTS "Admins can manage home visit reports" ON home_visit_reports;  
CREATE POLICY "Admins and management can manage all home visit reports"
ON home_visit_reports
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'management'::user_role]));

DROP POLICY IF EXISTS "Admins can manage school visit reports" ON school_visit_reports;
CREATE POLICY "Admins and management can manage all school visit reports" 
ON school_visit_reports
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'management'::user_role]));

DROP POLICY IF EXISTS "Admins can manage program reports" ON program_reports;
CREATE POLICY "Admins and management can manage all program reports"
ON program_reports  
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'management'::user_role]));