-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Fixes: mutable search_path, permissive RLS policies
-- =====================================================

-- =====================================================
-- PART 1: FIX FUNCTION SEARCH_PATH ISSUES
-- =====================================================

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_roles.user_id = $1
    ORDER BY CASE role
        WHEN 'admin' THEN 1
        WHEN 'management' THEN 2
        WHEN 'staff' THEN 3
        ELSE 4
    END
    LIMIT 1;
$$;

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    );
$$;

-- Fix audit_user_role_changes function
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            event_type,
            entity_type,
            entity_id,
            user_id,
            new_values,
            metadata
        ) VALUES (
            'role_granted',
            'user_roles',
            NEW.id,
            NEW.granted_by,
            to_jsonb(NEW),
            jsonb_build_object('target_user_id', NEW.user_id, 'role', NEW.role)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            event_type,
            entity_type,
            entity_id,
            user_id,
            old_values,
            metadata
        ) VALUES (
            'role_revoked',
            'user_roles',
            OLD.id,
            auth.uid(),
            to_jsonb(OLD),
            jsonb_build_object('target_user_id', OLD.user_id, 'role', OLD.role)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- =====================================================
-- PART 2: FIX RATE_LIMITS TABLE - Remove permissive policy
-- =====================================================
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

-- Replace with proper security definer function access only
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits FOR ALL
USING (auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    get_user_role(auth.uid()) = 'admin'::user_role
))
WITH CHECK (auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    get_user_role(auth.uid()) = 'admin'::user_role
));

-- =====================================================
-- PART 3: FIX TABLES WITH USING(true) SELECT POLICIES
-- These leak data across organizations
-- =====================================================

-- ============ FEEDING_PROGRAM ============
DROP POLICY IF EXISTS "Authenticated users can view feeding program" ON public.feeding_program;
-- Keep the org-scoped policy that already exists

-- ============ SUPPORT_GROUP_ACTIVITIES ============
DROP POLICY IF EXISTS "Authenticated users can view support group activities" ON public.support_group_activities;

-- Add org-scoped policy via parent support_groups table
CREATE POLICY "Users can view support group activities in their org"
ON public.support_group_activities FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.support_groups sg
        WHERE sg.id = support_group_activities.support_group_id
        AND user_belongs_to_org(auth.uid(), sg.organization_id)
    )
);

CREATE POLICY "Users can insert support group activities in their org"
ON public.support_group_activities FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.support_groups sg
        WHERE sg.id = support_group_activities.support_group_id
        AND user_belongs_to_org(auth.uid(), sg.organization_id)
    )
);

CREATE POLICY "Users can update support group activities in their org"
ON public.support_group_activities FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.support_groups sg
        WHERE sg.id = support_group_activities.support_group_id
        AND user_belongs_to_org(auth.uid(), sg.organization_id)
    )
);

CREATE POLICY "Admins can delete support group activities in their org"
ON public.support_group_activities FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.support_groups sg
        WHERE sg.id = support_group_activities.support_group_id
        AND user_belongs_to_org(auth.uid(), sg.organization_id)
        AND get_org_member_role(auth.uid(), sg.organization_id) IN ('admin', 'owner')
    )
);

-- ============ SUPPORT_GROUPS ============
DROP POLICY IF EXISTS "Authenticated users can view support groups" ON public.support_groups;
-- Keep org-scoped policy

-- ============ SELF_EMPOWERMENT ============
DROP POLICY IF EXISTS "Authenticated users can view self empowerment" ON public.self_empowerment;
-- Keep org-scoped policy

-- ============ KIPAWA_SATO ============
DROP POLICY IF EXISTS "Authenticated users can view kipawa sato" ON public.kipawa_sato;
-- Keep org-scoped policy

-- ============ ACTIVITIES ============
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;

-- Add org-scoped policy via child table
CREATE POLICY "Users can view activities in their org"
ON public.activities FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = activities.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Users can insert activities in their org"
ON public.activities FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = activities.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Users can update activities in their org"
ON public.activities FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = activities.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

-- ============ ACTIVITY_REPORTS ============
DROP POLICY IF EXISTS "Authenticated users can view activity reports" ON public.activity_reports;
-- Keep org-scoped policy

-- ============ SCHOOL_VISIT_REPORTS ============
DROP POLICY IF EXISTS "Authenticated users can view school visit reports" ON public.school_visit_reports;
-- Keep org-scoped policy

-- ============ HOME_VISIT_REPORTS ============
DROP POLICY IF EXISTS "Authenticated users can view home visit reports" ON public.home_visit_reports;
-- Keep org-scoped policy

-- ============ LOAN_REPAYMENTS ============
DROP POLICY IF EXISTS "Authenticated users can view loan repayments" ON public.loan_repayments;

-- Add org-scoped policy via self_empowerment table
CREATE POLICY "Users can view loan repayments in their org"
ON public.loan_repayments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.self_empowerment se
        WHERE se.id = loan_repayments.self_empowerment_id
        AND user_belongs_to_org(auth.uid(), se.organization_id)
    )
);

CREATE POLICY "Users can insert loan repayments in their org"
ON public.loan_repayments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.self_empowerment se
        WHERE se.id = loan_repayments.self_empowerment_id
        AND user_belongs_to_org(auth.uid(), se.organization_id)
    )
);

CREATE POLICY "Users can update loan repayments in their org"
ON public.loan_repayments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.self_empowerment se
        WHERE se.id = loan_repayments.self_empowerment_id
        AND user_belongs_to_org(auth.uid(), se.organization_id)
    )
);

CREATE POLICY "Admins can delete loan repayments in their org"
ON public.loan_repayments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.self_empowerment se
        WHERE se.id = loan_repayments.self_empowerment_id
        AND user_belongs_to_org(auth.uid(), se.organization_id)
        AND get_org_member_role(auth.uid(), se.organization_id) IN ('admin', 'owner')
    )
);

-- ============ PROGRAM_ENTRIES ============
DROP POLICY IF EXISTS "Authenticated users can view program entries" ON public.program_entries;

-- Add org-scoped policy via programs table
CREATE POLICY "Users can view program entries in their org"
ON public.program_entries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_entries.program_id
        AND user_belongs_to_org(auth.uid(), p.organization_id)
    )
);

CREATE POLICY "Users can insert program entries in their org"
ON public.program_entries FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_entries.program_id
        AND user_belongs_to_org(auth.uid(), p.organization_id)
    )
);

CREATE POLICY "Users can update program entries in their org"
ON public.program_entries FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_entries.program_id
        AND user_belongs_to_org(auth.uid(), p.organization_id)
    )
);

CREATE POLICY "Admins can delete program entries in their org"
ON public.program_entries FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_entries.program_id
        AND user_belongs_to_org(auth.uid(), p.organization_id)
        AND get_org_member_role(auth.uid(), p.organization_id) IN ('admin', 'owner')
    )
);

-- ============ CHILD_PROGRAMS ============
DROP POLICY IF EXISTS "Authenticated users can view child programs" ON public.child_programs;

-- Add org-scoped policy via children table
CREATE POLICY "Users can view child programs in their org"
ON public.child_programs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = child_programs.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Users can insert child programs in their org"
ON public.child_programs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = child_programs.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Users can update child programs in their org"
ON public.child_programs FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = child_programs.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Admins can delete child programs in their org"
ON public.child_programs FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = child_programs.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
        AND get_org_member_role(auth.uid(), c.organization_id) IN ('admin', 'owner')
    )
);

-- ============ ACADEMIC_HISTORY ============
DROP POLICY IF EXISTS "Authenticated users can view academic history" ON public.academic_history;

-- Add org-scoped policy via children table
CREATE POLICY "Users can view academic history in their org"
ON public.academic_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = academic_history.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Users can insert academic history in their org"
ON public.academic_history FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = academic_history.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Users can update academic history in their org"
ON public.academic_history FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = academic_history.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Admins can delete academic history in their org"
ON public.academic_history FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = academic_history.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
        AND get_org_member_role(auth.uid(), c.organization_id) IN ('admin', 'owner')
    )
);

-- =====================================================
-- PART 4: ADD MISSING RLS TO TABLES WITHOUT ORG SCOPE
-- =====================================================

-- ============ TRANSPORT_RECORDS ============
-- Enable RLS if not already
ALTER TABLE public.transport_records ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view transport records" ON public.transport_records;

-- Add org-scoped policies via children table
CREATE POLICY "Users can view transport records in their org"
ON public.transport_records FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = transport_records.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Users can insert transport records in their org"
ON public.transport_records FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = transport_records.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Users can update transport records in their org"
ON public.transport_records FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = transport_records.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Admins can delete transport records in their org"
ON public.transport_records FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = transport_records.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
        AND get_org_member_role(auth.uid(), c.organization_id) IN ('admin', 'owner')
    )
);

-- ============ VISITS ============
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view visits" ON public.visits;

CREATE POLICY "Users can view visits in their org"
ON public.visits FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = visits.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Users can insert visits in their org"
ON public.visits FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = visits.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Users can update visits in their org"
ON public.visits FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = visits.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

CREATE POLICY "Admins can delete visits in their org"
ON public.visits FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = visits.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
        AND get_org_member_role(auth.uid(), c.organization_id) IN ('admin', 'owner')
    )
);

-- ============ DOCUMENTS ============
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;

-- Documents can be linked to children or family_adoption
CREATE POLICY "Users can view documents in their org"
ON public.documents FOR SELECT
USING (
    (child_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = documents.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    ))
    OR
    (family_adoption_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_adoption fa
        WHERE fa.id = documents.family_adoption_id
        AND user_belongs_to_org(auth.uid(), fa.organization_id)
    ))
    OR
    (child_id IS NULL AND family_adoption_id IS NULL AND auth.uid() IS NOT NULL)
);

CREATE POLICY "Users can insert documents in their org"
ON public.documents FOR INSERT
WITH CHECK (
    (child_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = documents.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    ))
    OR
    (family_adoption_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_adoption fa
        WHERE fa.id = documents.family_adoption_id
        AND user_belongs_to_org(auth.uid(), fa.organization_id)
    ))
    OR
    (child_id IS NULL AND family_adoption_id IS NULL AND auth.uid() IS NOT NULL)
);

CREATE POLICY "Users can update documents in their org"
ON public.documents FOR UPDATE
USING (
    (child_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = documents.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    ))
    OR
    (family_adoption_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_adoption fa
        WHERE fa.id = documents.family_adoption_id
        AND user_belongs_to_org(auth.uid(), fa.organization_id)
    ))
);

CREATE POLICY "Admins can delete documents in their org"
ON public.documents FOR DELETE
USING (
    (child_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = documents.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
        AND get_org_member_role(auth.uid(), c.organization_id) IN ('admin', 'owner')
    ))
    OR
    (family_adoption_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_adoption fa
        WHERE fa.id = documents.family_adoption_id
        AND user_belongs_to_org(auth.uid(), fa.organization_id)
        AND get_org_member_role(auth.uid(), fa.organization_id) IN ('admin', 'owner')
    ))
);

-- ============ REPLACEMENTS ============
-- Add organization_id column if missing, then add RLS
ALTER TABLE public.replacements 
ADD COLUMN IF NOT EXISTS organization_id uuid DEFAULT 'a0000000-0000-0000-0000-000000000001'::uuid;

ALTER TABLE public.replacements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view replacements" ON public.replacements;

CREATE POLICY "Users can view replacements in their org"
ON public.replacements FOR SELECT
USING (
    user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can insert replacements in their org"
ON public.replacements FOR INSERT
WITH CHECK (
    user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can update replacements in their org"
ON public.replacements FOR UPDATE
USING (
    user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Admins can delete replacements in their org"
ON public.replacements FOR DELETE
USING (
    user_belongs_to_org(auth.uid(), organization_id)
    AND get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============ ATTENDANCE_RECORDS ============
-- Add organization_id if missing
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS organization_id uuid DEFAULT 'a0000000-0000-0000-0000-000000000001'::uuid;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view attendance" ON public.attendance_records;

CREATE POLICY "Users can view attendance in their org"
ON public.attendance_records FOR SELECT
USING (
    user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can insert attendance in their org"
ON public.attendance_records FOR INSERT
WITH CHECK (
    user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can update attendance in their org"
ON public.attendance_records FOR UPDATE
USING (
    user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Admins can delete attendance in their org"
ON public.attendance_records FOR DELETE
USING (
    user_belongs_to_org(auth.uid(), organization_id)
    AND get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);

-- ============ MODULE_ENTRIES ============
ALTER TABLE public.module_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view module entries" ON public.module_entries;

CREATE POLICY "Users can view module entries in their org"
ON public.module_entries FOR SELECT
USING (
    user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can insert module entries in their org"
ON public.module_entries FOR INSERT
WITH CHECK (
    user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can update module entries in their org"
ON public.module_entries FOR UPDATE
USING (
    user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Admins can delete module entries in their org"
ON public.module_entries FOR DELETE
USING (
    user_belongs_to_org(auth.uid(), organization_id)
    AND get_org_member_role(auth.uid(), organization_id) IN ('admin', 'owner')
);