-- =====================================================
-- SECURITY HARDENING PART 3 - Final Cleanup
-- Remove all remaining permissive USING(true) policies
-- =====================================================

-- Drop old audit_logs policy and use authenticated check
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Allow trigger functions to insert (they run as SECURITY DEFINER)
-- For manual inserts, require authentication
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Drop remaining permissive SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can view business visit reports" ON public.business_visit_reports;
DROP POLICY IF EXISTS "Authenticated users can view family adoption" ON public.family_adoption;
DROP POLICY IF EXISTS "Authenticated users can view medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Authenticated users can view program reports" ON public.program_reports;
DROP POLICY IF EXISTS "Users can view transport records" ON public.transport_records;

-- Fix transport_records - the old policy used USING(true), recreate with org scope
DROP POLICY IF EXISTS "Users can view transport records in their org" ON public.transport_records;
CREATE POLICY "Users can view transport records in their org"
ON public.transport_records FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.children c
        WHERE c.id = transport_records.child_id
        AND user_belongs_to_org(auth.uid(), c.organization_id)
    )
);

-- organization_invitations - keep Anyone can lookup by token (intentional for invitation flow)
-- This is needed so users can accept invitations via token link

-- =====================================================
-- Update security findings status
-- =====================================================