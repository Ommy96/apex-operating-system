-- =====================================================
-- INDICATOR ENGINE - Core Tables
-- Supports formulas, periodic targets, and aggregations
-- =====================================================

-- Indicator Categories for organization
CREATE TABLE public.indicator_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'BarChart3',
    color TEXT DEFAULT '#6366f1',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Core indicators table
CREATE TABLE public.indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.indicator_categories(id) ON DELETE SET NULL,
    
    -- Basic info
    name TEXT NOT NULL,
    code TEXT NOT NULL, -- Short code like "BEN-001"
    description TEXT,
    unit TEXT DEFAULT 'count', -- count, percentage, currency, etc.
    
    -- Formula configuration (JSONB for flexibility)
    formula_type TEXT NOT NULL CHECK (formula_type IN ('count', 'sum', 'average', 'ratio', 'percentage', 'custom')),
    formula_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example configs:
    -- count: {"table": "children", "filters": {"status": "active"}}
    -- sum: {"table": "self_empowerment", "field": "amount_approved", "filters": {}}
    -- ratio: {"numerator": {"table": "children", "filters": {"gender": "female"}}, "denominator": {"table": "children", "filters": {}}}
    -- percentage: same as ratio but *100
    -- custom: {"sql": "SELECT COUNT(*) FROM children WHERE..."} -- for admins only
    
    -- Aggregation settings
    aggregation_period TEXT DEFAULT 'monthly' CHECK (aggregation_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    
    -- Display settings
    decimal_places INTEGER DEFAULT 0,
    show_trend BOOLEAN DEFAULT true,
    trend_direction TEXT DEFAULT 'up_is_good' CHECK (trend_direction IN ('up_is_good', 'down_is_good', 'neutral')),
    
    -- Template info
    is_template BOOLEAN DEFAULT false,
    template_source_id UUID REFERENCES public.indicators(id),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(organization_id, code)
);

-- Indicator targets (periodic)
CREATE TABLE public.indicator_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
    
    -- Period specification
    period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
    period_year INTEGER NOT NULL,
    period_value INTEGER NOT NULL, -- 1-12 for monthly, 1-4 for quarterly, 1 for yearly
    
    -- Target values
    target_value NUMERIC NOT NULL,
    minimum_value NUMERIC, -- Red threshold
    stretch_value NUMERIC, -- Exceed target
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(indicator_id, period_type, period_year, period_value)
);

-- Indicator values (computed or manually entered)
CREATE TABLE public.indicator_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Values
    actual_value NUMERIC NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT now(),
    is_manual_override BOOLEAN DEFAULT false,
    
    -- For breakdown/drill-down
    dimension_key TEXT, -- e.g., 'location', 'gender', 'program'
    dimension_value TEXT, -- e.g., 'Nairobi', 'female', 'feeding_program'
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(indicator_id, period_start, period_end, dimension_key, dimension_value)
);

-- Indicator templates library (system-wide)
CREATE TABLE public.indicator_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL, -- 'beneficiaries', 'programs', 'finance', 'reports', etc.
    
    unit TEXT DEFAULT 'count',
    formula_type TEXT NOT NULL,
    formula_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    aggregation_period TEXT DEFAULT 'monthly',
    decimal_places INTEGER DEFAULT 0,
    trend_direction TEXT DEFAULT 'up_is_good',
    
    -- For display
    icon TEXT DEFAULT 'TrendingUp',
    default_target NUMERIC,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE public.indicator_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_templates ENABLE ROW LEVEL SECURITY;

-- Indicator Categories policies
CREATE POLICY "Users can view indicator categories in their org"
ON public.indicator_categories FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can insert indicator categories"
ON public.indicator_categories FOR INSERT
WITH CHECK (
    user_belongs_to_org(auth.uid(), organization_id) 
    AND get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
);

CREATE POLICY "Admins can update indicator categories"
ON public.indicator_categories FOR UPDATE
USING (
    user_belongs_to_org(auth.uid(), organization_id) 
    AND get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
);

CREATE POLICY "Admins can delete indicator categories"
ON public.indicator_categories FOR DELETE
USING (
    user_belongs_to_org(auth.uid(), organization_id) 
    AND get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
);

-- Indicators policies
CREATE POLICY "Users can view indicators in their org"
ON public.indicators FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can insert indicators"
ON public.indicators FOR INSERT
WITH CHECK (
    user_belongs_to_org(auth.uid(), organization_id) 
    AND get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
);

CREATE POLICY "Admins can update indicators"
ON public.indicators FOR UPDATE
USING (
    user_belongs_to_org(auth.uid(), organization_id) 
    AND get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
);

CREATE POLICY "Admins can delete indicators"
ON public.indicators FOR DELETE
USING (
    user_belongs_to_org(auth.uid(), organization_id) 
    AND get_org_member_role(auth.uid(), organization_id) IN ('owner', 'admin')
);

-- Indicator Targets policies
CREATE POLICY "Users can view indicator targets in their org"
ON public.indicator_targets FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.indicators i
        WHERE i.id = indicator_targets.indicator_id
        AND user_belongs_to_org(auth.uid(), i.organization_id)
    )
);

CREATE POLICY "Admins can insert indicator targets"
ON public.indicator_targets FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.indicators i
        WHERE i.id = indicator_targets.indicator_id
        AND user_belongs_to_org(auth.uid(), i.organization_id)
        AND get_org_member_role(auth.uid(), i.organization_id) IN ('owner', 'admin')
    )
);

CREATE POLICY "Admins can update indicator targets"
ON public.indicator_targets FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.indicators i
        WHERE i.id = indicator_targets.indicator_id
        AND user_belongs_to_org(auth.uid(), i.organization_id)
        AND get_org_member_role(auth.uid(), i.organization_id) IN ('owner', 'admin')
    )
);

CREATE POLICY "Admins can delete indicator targets"
ON public.indicator_targets FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.indicators i
        WHERE i.id = indicator_targets.indicator_id
        AND user_belongs_to_org(auth.uid(), i.organization_id)
        AND get_org_member_role(auth.uid(), i.organization_id) IN ('owner', 'admin')
    )
);

-- Indicator Values policies
CREATE POLICY "Users can view indicator values in their org"
ON public.indicator_values FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.indicators i
        WHERE i.id = indicator_values.indicator_id
        AND user_belongs_to_org(auth.uid(), i.organization_id)
    )
);

CREATE POLICY "Admins can insert indicator values"
ON public.indicator_values FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.indicators i
        WHERE i.id = indicator_values.indicator_id
        AND user_belongs_to_org(auth.uid(), i.organization_id)
        AND get_org_member_role(auth.uid(), i.organization_id) IN ('owner', 'admin')
    )
);

CREATE POLICY "Admins can update indicator values"
ON public.indicator_values FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.indicators i
        WHERE i.id = indicator_values.indicator_id
        AND user_belongs_to_org(auth.uid(), i.organization_id)
        AND get_org_member_role(auth.uid(), i.organization_id) IN ('owner', 'admin')
    )
);

CREATE POLICY "Admins can delete indicator values"
ON public.indicator_values FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.indicators i
        WHERE i.id = indicator_values.indicator_id
        AND user_belongs_to_org(auth.uid(), i.organization_id)
        AND get_org_member_role(auth.uid(), i.organization_id) IN ('owner', 'admin')
    )
);

-- Indicator Templates (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view indicator templates"
ON public.indicator_templates FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only super admins can manage templates
CREATE POLICY "Super admins can manage indicator templates"
ON public.indicator_templates FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- =====================================================
-- Seed default indicator templates
-- =====================================================

INSERT INTO public.indicator_templates (code, name, description, category, formula_type, formula_config, unit, trend_direction, icon, default_target) VALUES
-- Beneficiary indicators
('BEN-001', 'Total Active Beneficiaries', 'Count of all active children/beneficiaries', 'beneficiaries', 'count', '{"table": "children", "filters": {"status": "active"}}', 'count', 'up_is_good', 'Users', 100),
('BEN-002', 'Female Beneficiaries %', 'Percentage of female beneficiaries', 'beneficiaries', 'percentage', '{"numerator": {"table": "children", "filters": {"gender": "female", "status": "active"}}, "denominator": {"table": "children", "filters": {"status": "active"}}}', 'percentage', 'neutral', 'UserCheck', 50),
('BEN-003', 'New Enrollments (Monthly)', 'Number of new beneficiaries enrolled this month', 'beneficiaries', 'count', '{"table": "children", "filters": {"status": "active"}, "date_field": "enrollment_date", "date_range": "current_period"}', 'count', 'up_is_good', 'UserPlus', 10),

-- Program indicators
('PRG-001', 'Feeding Program Participants', 'Total beneficiaries in feeding program', 'programs', 'count', '{"table": "feeding_program", "filters": {}}', 'count', 'up_is_good', 'Apple', 50),
('PRG-002', 'Self-Empowerment Active Loans', 'Number of active self-empowerment loans', 'programs', 'count', '{"table": "self_empowerment", "filters": {"is_active": true}}', 'count', 'up_is_good', 'Briefcase', 20),
('PRG-003', 'Total Loan Amount Disbursed', 'Sum of all approved loan amounts', 'programs', 'sum', '{"table": "self_empowerment", "field": "amount_approved", "filters": {}}', 'currency', 'up_is_good', 'DollarSign', 100000),

-- Report indicators
('RPT-001', 'Home Visits Completed (Monthly)', 'Number of home visits conducted', 'reports', 'count', '{"table": "home_visit_reports", "filters": {}, "date_field": "visit_date", "date_range": "current_period"}', 'count', 'up_is_good', 'Home', 20),
('RPT-002', 'School Visits Completed (Monthly)', 'Number of school visits conducted', 'reports', 'count', '{"table": "school_visit_reports", "filters": {}, "date_field": "visit_date", "date_range": "current_period"}', 'count', 'up_is_good', 'GraduationCap', 15),
('RPT-003', 'Activity Reports Submitted (Monthly)', 'Number of activity reports submitted', 'reports', 'count', '{"table": "activity_reports", "filters": {}, "date_field": "reporting_date", "date_range": "current_period"}', 'count', 'up_is_good', 'FileText', 10),

-- Alumni indicators
('ALM-001', 'Total Alumni', 'Count of all registered alumni', 'outcomes', 'count', '{"table": "alumni", "filters": {}}', 'count', 'up_is_good', 'GraduationCap', 50),
('ALM-002', 'Alumni with Employment', 'Alumni currently employed', 'outcomes', 'count', '{"table": "alumni", "filters": {"current_status": "employed"}}', 'count', 'up_is_good', 'Briefcase', 30),

-- Support Group indicators
('SUP-001', 'Active Support Groups', 'Number of active support groups', 'community', 'count', '{"table": "support_groups", "filters": {}}', 'count', 'up_is_good', 'Users', 10),
('SUP-002', 'Total Support Group Members', 'Sum of all support group members', 'community', 'sum', '{"table": "support_groups", "field": "member_count", "filters": {}}', 'count', 'up_is_good', 'Users', 200);

-- =====================================================
-- Indexes for performance
-- =====================================================

CREATE INDEX idx_indicators_org ON public.indicators(organization_id);
CREATE INDEX idx_indicators_category ON public.indicators(category_id);
CREATE INDEX idx_indicators_active ON public.indicators(is_active) WHERE is_active = true;
CREATE INDEX idx_indicator_targets_indicator ON public.indicator_targets(indicator_id);
CREATE INDEX idx_indicator_targets_period ON public.indicator_targets(period_year, period_type);
CREATE INDEX idx_indicator_values_indicator ON public.indicator_values(indicator_id);
CREATE INDEX idx_indicator_values_period ON public.indicator_values(period_start, period_end);
CREATE INDEX idx_indicator_categories_org ON public.indicator_categories(organization_id);

-- =====================================================
-- Update trigger for timestamps
-- =====================================================

CREATE TRIGGER update_indicator_categories_updated_at
    BEFORE UPDATE ON public.indicator_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_indicators_updated_at
    BEFORE UPDATE ON public.indicators
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_indicator_targets_updated_at
    BEFORE UPDATE ON public.indicator_targets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_indicator_values_updated_at
    BEFORE UPDATE ON public.indicator_values
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();