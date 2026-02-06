-- =====================================================
-- Enable RLS and add policies for new tables
-- =====================================================

-- 1. Enable RLS on all new tables
ALTER TABLE public.program_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_indicators ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for program_donors
CREATE POLICY "Users can view program donors in their organization"
ON public.program_donors FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create program donors in their organization"
ON public.program_donors FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update program donors in their organization"
ON public.program_donors FOR UPDATE
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete program donors in their organization"
ON public.program_donors FOR DELETE
USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- 3. RLS Policies for activity_attendance
CREATE POLICY "Users can view attendance in their organization"
ON public.activity_attendance FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can record attendance in their organization"
ON public.activity_attendance FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update attendance in their organization"
ON public.activity_attendance FOR UPDATE
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete attendance in their organization"
ON public.activity_attendance FOR DELETE
USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- 4. RLS Policies for program_observations
CREATE POLICY "Users can view observations in their organization"
ON public.program_observations FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create observations in their organization"
ON public.program_observations FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update observations in their organization"
ON public.program_observations FOR UPDATE
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete observations in their organization"
ON public.program_observations FOR DELETE
USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- 5. RLS Policies for program_indicators
CREATE POLICY "Users can view indicators in their organization"
ON public.program_indicators FOR SELECT
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create indicators in their organization"
ON public.program_indicators FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update indicators in their organization"
ON public.program_indicators FOR UPDATE
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete indicators in their organization"
ON public.program_indicators FOR DELETE
USING (public.user_belongs_to_org(auth.uid(), organization_id));