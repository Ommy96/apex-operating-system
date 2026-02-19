
-- ============================================================
-- PHASE 2: RLS Security Hardening (profiles + remaining tables)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PROFILES — consolidate duplicate/legacy policies
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Clean, non-recursive org-scoped profile policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Org members can view profiles in org"
ON public.profiles FOR SELECT
USING (
  organization_id IS NOT NULL
  AND public.user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Org admins can update any profile in org"
ON public.profiles FOR UPDATE
USING (
  organization_id IS NOT NULL
  AND public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ────────────────────────────────────────────────────────────
-- ACADEMIC_HISTORY — replace legacy admin ALL policy
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage academic history" ON public.academic_history;
DROP POLICY IF EXISTS "Admins can delete academic history in their org" ON public.academic_history;

CREATE POLICY "Org admins can delete academic history"
ON public.academic_history FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = academic_history.child_id
      AND public.user_belongs_to_org(auth.uid(), c.organization_id)
      AND public.get_org_member_role(auth.uid(), c.organization_id) IN ('admin', 'management', 'owner')
  )
);

-- ────────────────────────────────────────────────────────────
-- ACTIVITIES — replace legacy admin ALL policy
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage activities" ON public.activities;

CREATE POLICY "Org admins can delete activities"
ON public.activities FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = activities.child_id
      AND public.user_belongs_to_org(auth.uid(), c.organization_id)
      AND public.get_org_member_role(auth.uid(), c.organization_id) IN ('admin', 'management', 'owner')
  )
);

-- ────────────────────────────────────────────────────────────
-- CHILDREN — replace legacy get_user_role policies
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff and above can view basic child info" ON public.children;
DROP POLICY IF EXISTS "Staff and admins can insert children" ON public.children;
DROP POLICY IF EXISTS "Staff and admins can update children" ON public.children;
DROP POLICY IF EXISTS "Admins can delete children" ON public.children;
DROP POLICY IF EXISTS "Users can insert children in their organization" ON public.children;

CREATE POLICY "Org members can view children"
ON public.children FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can insert children"
ON public.children FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org members can update children"
ON public.children FOR UPDATE
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete children"
ON public.children FOR DELETE
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'management', 'owner')
);

-- ────────────────────────────────────────────────────────────
-- CHILD_PROGRAMS — replace legacy admin ALL policy
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage child programs" ON public.child_programs;

CREATE POLICY "Org admins can delete child programs"
ON public.child_programs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = child_programs.program_id
      AND public.user_belongs_to_org(auth.uid(), p.organization_id)
      AND public.get_org_member_role(auth.uid(), p.organization_id) IN ('admin', 'management', 'owner')
  )
);

CREATE POLICY "Org members can update child programs"
ON public.child_programs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = child_programs.program_id
      AND public.user_belongs_to_org(auth.uid(), p.organization_id)
  )
);

-- ────────────────────────────────────────────────────────────
-- DOCUMENTS — replace legacy admin ALL policy, scope properly
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON public.documents;

CREATE POLICY "Org members can view their documents"
ON public.documents FOR SELECT
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = documents.child_id
      AND public.user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

CREATE POLICY "Authenticated users can upload documents"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Uploaders can update their documents"
ON public.documents FOR UPDATE
USING (uploaded_by = auth.uid());

CREATE POLICY "Org admins can delete documents"
ON public.documents FOR DELETE
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = documents.child_id
      AND public.user_belongs_to_org(auth.uid(), c.organization_id)
      AND public.get_org_member_role(auth.uid(), c.organization_id) IN ('admin', 'management', 'owner')
  )
);

-- ────────────────────────────────────────────────────────────
-- MODULE_ENTRIES — replace legacy admin DELETE policy
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can delete module entries" ON public.module_entries;
DROP POLICY IF EXISTS "Users can insert module entries" ON public.module_entries;
DROP POLICY IF EXISTS "Users can insert module entries in their org" ON public.module_entries;

CREATE POLICY "Org members can insert module entries"
ON public.module_entries FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete module entries"
ON public.module_entries FOR DELETE
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'management', 'owner')
);

-- ────────────────────────────────────────────────────────────
-- APPROVAL_REQUESTS — replace legacy admin policies, add DELETE
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Admins can update approval requests" ON public.approval_requests;

CREATE POLICY "Org admins can view all approval requests"
ON public.approval_requests FOR SELECT
USING (
  requester_id = auth.uid()
  OR public.get_org_member_role(auth.uid(), public.get_user_organization_id(auth.uid())) IN ('admin', 'management', 'owner')
);

CREATE POLICY "Org admins can update approval requests"
ON public.approval_requests FOR UPDATE
USING (
  public.get_org_member_role(auth.uid(), public.get_user_organization_id(auth.uid())) IN ('admin', 'management', 'owner')
);

CREATE POLICY "Org admins can delete approval requests"
ON public.approval_requests FOR DELETE
USING (
  public.get_org_member_role(auth.uid(), public.get_user_organization_id(auth.uid())) IN ('admin', 'management', 'owner')
);

-- ────────────────────────────────────────────────────────────
-- API_USAGE_LOGS — tighten SELECT to org admins only
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Super admins can view all API logs" ON public.api_usage_logs;

CREATE POLICY "Org admins can view their API logs"
ON public.api_usage_logs FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'management', 'owner')
);

-- ────────────────────────────────────────────────────────────
-- INDICATOR_TEMPLATES — restrict to platform super admins only
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Super admins can manage indicator templates" ON public.indicator_templates;

CREATE POLICY "Super admins can manage indicator templates"
ON public.indicator_templates FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ────────────────────────────────────────────────────────────
-- RBAC_ROLE_PERMISSIONS — add missing UPDATE policy
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Org admins can update role permissions"
ON public.rbac_role_permissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.rbac_roles r
    WHERE r.id = rbac_role_permissions.role_id
      AND public.get_org_member_role(auth.uid(), r.organization_id) IN ('admin', 'owner')
  )
);

-- ────────────────────────────────────────────────────────────
-- PROGRAM_REPORT_TYPES — ensure org-scoped (only if no policies)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'program_report_types'
  ) THEN
    EXECUTE 'CREATE POLICY "Org members can view report types"
      ON public.program_report_types FOR SELECT
      USING (public.user_belongs_to_org(auth.uid(), organization_id))';

    EXECUTE 'CREATE POLICY "Org admins can manage report types"
      ON public.program_report_types FOR ALL
      USING (
        public.user_belongs_to_org(auth.uid(), organization_id)
        AND public.get_org_member_role(auth.uid(), organization_id) IN (''admin'', ''management'', ''owner'')
      )
      WITH CHECK (
        public.user_belongs_to_org(auth.uid(), organization_id)
        AND public.get_org_member_role(auth.uid(), organization_id) IN (''admin'', ''management'', ''owner'')
      )';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- REPORT_ENTRIES & REPORT_TEMPLATES — ensure org-scoped
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'report_entries'
  ) THEN
    EXECUTE 'CREATE POLICY "Org members can manage report entries"
      ON public.report_entries FOR ALL
      USING (public.user_belongs_to_org(auth.uid(), organization_id))
      WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'report_templates'
  ) THEN
    EXECUTE 'CREATE POLICY "Org members can view report templates"
      ON public.report_templates FOR SELECT
      USING (public.user_belongs_to_org(auth.uid(), organization_id))';

    EXECUTE 'CREATE POLICY "Org admins can manage report templates"
      ON public.report_templates FOR ALL
      USING (
        public.user_belongs_to_org(auth.uid(), organization_id)
        AND public.get_org_member_role(auth.uid(), organization_id) IN (''admin'', ''management'', ''owner'')
      )
      WITH CHECK (
        public.user_belongs_to_org(auth.uid(), organization_id)
        AND public.get_org_member_role(auth.uid(), organization_id) IN (''admin'', ''management'', ''owner'')
      )';
  END IF;
END $$;
