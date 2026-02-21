
-- Board members table
CREATE TABLE public.board_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  title TEXT,
  is_active BOOLEAN DEFAULT true,
  invited_at TIMESTAMPTZ DEFAULT now(),
  last_access_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Board reports table
CREATE TABLE public.board_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  meeting_date DATE,
  meeting_agenda TEXT,
  executive_summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Board report sections
CREATE TABLE public.board_report_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.board_reports(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  narrative TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_report_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies using existing helper functions
CREATE POLICY "Users can view board members in their org" ON public.board_members
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can manage board members" ON public.board_members
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

CREATE POLICY "Users can view board reports in their org" ON public.board_reports
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can manage board reports" ON public.board_reports
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

CREATE POLICY "Users can view board report sections in their org" ON public.board_report_sections
  FOR SELECT USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can manage board report sections" ON public.board_report_sections
  FOR ALL USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'management'))
  );

-- Indexes
CREATE INDEX idx_board_members_org ON public.board_members(organization_id);
CREATE INDEX idx_board_reports_org ON public.board_reports(organization_id);
CREATE INDEX idx_board_report_sections_report ON public.board_report_sections(report_id);
