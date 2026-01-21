-- =====================================================
-- SECURITY HARDENING PART 2 (FIXED)
-- Fix user_roles table policies with proper DROP first
-- =====================================================

-- Drop existing user_roles policies first
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- Now create the proper policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles or admins can view all
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (
    user_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role
);

-- Only super admins can manage roles
CREATE POLICY "Super admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (
    get_user_role(auth.uid()) = 'admin'::user_role
);

CREATE POLICY "Super admins can update roles"
ON public.user_roles FOR UPDATE
USING (
    get_user_role(auth.uid()) = 'admin'::user_role
);

CREATE POLICY "Super admins can delete roles"
ON public.user_roles FOR DELETE
USING (
    get_user_role(auth.uid()) = 'admin'::user_role
);

-- =====================================================
-- FIX PROGRAM_REPORT_TYPES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view program report types in their org" ON public.program_report_types;
DROP POLICY IF EXISTS "Admins can insert program report types in their org" ON public.program_report_types;
DROP POLICY IF EXISTS "Admins can update program report types in their org" ON public.program_report_types;
DROP POLICY IF EXISTS "Admins can delete program report types in their org" ON public.program_report_types;
DROP POLICY IF EXISTS "Authenticated users can view program report types" ON public.program_report_types;

ALTER TABLE public.program_report_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view program report types in their org"
ON public.program_report_types FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_report_types.program_id
        AND user_belongs_to_org(auth.uid(), p.organization_id)
    )
);

CREATE POLICY "Admins can insert program report types in their org"
ON public.program_report_types FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_report_types.program_id
        AND user_belongs_to_org(auth.uid(), p.organization_id)
        AND get_org_member_role(auth.uid(), p.organization_id) IN ('admin', 'owner')
    )
);

CREATE POLICY "Admins can update program report types in their org"
ON public.program_report_types FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_report_types.program_id
        AND user_belongs_to_org(auth.uid(), p.organization_id)
        AND get_org_member_role(auth.uid(), p.organization_id) IN ('admin', 'owner')
    )
);

CREATE POLICY "Admins can delete program report types in their org"
ON public.program_report_types FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = program_report_types.program_id
        AND user_belongs_to_org(auth.uid(), p.organization_id)
        AND get_org_member_role(auth.uid(), p.organization_id) IN ('admin', 'owner')
    )
);