
-- Board Report Comments - for board members to comment on reports/sections
CREATE TABLE public.board_report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.board_reports(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.board_report_sections(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  board_member_id UUID REFERENCES public.board_members(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.board_report_comments(id) ON DELETE CASCADE,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.board_report_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage board report comments"
  ON public.board_report_comments FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

-- Board Report Approvals - formal approval/rejection votes
CREATE TABLE public.board_report_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.board_reports(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  board_member_id UUID REFERENCES public.board_members(id) ON DELETE CASCADE NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'abstained')),
  comments TEXT,
  voted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_id, board_member_id)
);

ALTER TABLE public.board_report_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage board report approvals"
  ON public.board_report_approvals FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

-- Board Action Items - track decisions and follow-ups
CREATE TABLE public.board_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.board_reports(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  assigned_member_id UUID REFERENCES public.board_members(id) ON DELETE SET NULL,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.board_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage board action items"
  ON public.board_action_items FOR ALL
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

-- Add access_token to board_members for portal login
ALTER TABLE public.board_members ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;
ALTER TABLE public.board_members ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX idx_board_comments_report ON public.board_report_comments(report_id);
CREATE INDEX idx_board_approvals_report ON public.board_report_approvals(report_id);
CREATE INDEX idx_board_action_items_report ON public.board_action_items(report_id);
CREATE INDEX idx_board_members_token ON public.board_members(access_token);
