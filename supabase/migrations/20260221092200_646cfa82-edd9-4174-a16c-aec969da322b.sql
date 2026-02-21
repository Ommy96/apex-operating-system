
-- =============================================
-- HR & STAFF MANAGEMENT MODULE
-- =============================================

-- 1. Staff Performance Contracts
CREATE TABLE public.staff_performance_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_title TEXT NOT NULL,
  contract_period_start DATE NOT NULL,
  contract_period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','under_review','completed','cancelled')),
  overall_score NUMERIC(5,2),
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_comments TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance contract KPIs/objectives
CREATE TABLE public.staff_contract_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.staff_performance_contracts(id) ON DELETE CASCADE,
  objective_title TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(5,2) DEFAULT 0,
  target_value NUMERIC(10,2),
  actual_value NUMERIC(10,2),
  unit TEXT,
  score NUMERIC(5,2),
  evidence TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Leave Management
CREATE TABLE public.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_days_per_year INT DEFAULT 0,
  is_paid BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year INT NOT NULL,
  total_days INT DEFAULT 0,
  used_days NUMERIC(5,1) DEFAULT 0,
  carried_over_days INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_user_id, leave_type_id, year)
);

CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested NUMERIC(5,1) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. GPS Field Verification
CREATE TABLE public.field_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  accuracy_meters NUMERIC(8,2),
  check_in_type TEXT NOT NULL DEFAULT 'field_visit' CHECK (check_in_type IN ('field_visit','office','meeting','training','other')),
  location_name TEXT,
  notes TEXT,
  photo_url TEXT,
  beneficiary_id UUID REFERENCES public.beneficiaries(id),
  activity_id UUID REFERENCES public.activities(id),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Task Management
CREATE TABLE public.staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','blocked','completed','cancelled')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  program_id UUID REFERENCES public.programs(id),
  project_id UUID REFERENCES public.projects(id),
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.staff_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.staff_performance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_contract_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Staff Performance Contracts
CREATE POLICY "Users can view contracts in their org" ON public.staff_performance_contracts
  FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create contracts in their org" ON public.staff_performance_contracts
  FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update contracts in their org" ON public.staff_performance_contracts
  FOR UPDATE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete contracts in their org" ON public.staff_performance_contracts
  FOR DELETE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Contract Objectives (inherit from parent)
CREATE POLICY "Users can view objectives" ON public.staff_contract_objectives
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff_performance_contracts c WHERE c.id = contract_id AND public.user_belongs_to_org(auth.uid(), c.organization_id))
  );

CREATE POLICY "Users can manage objectives" ON public.staff_contract_objectives
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff_performance_contracts c WHERE c.id = contract_id AND public.user_belongs_to_org(auth.uid(), c.organization_id))
  );

-- Leave Types
CREATE POLICY "Users can view leave types in their org" ON public.leave_types
  FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can manage leave types in their org" ON public.leave_types
  FOR ALL TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Leave Balances
CREATE POLICY "Users can view leave balances in their org" ON public.leave_balances
  FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can manage leave balances in their org" ON public.leave_balances
  FOR ALL TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Leave Requests
CREATE POLICY "Users can view leave requests in their org" ON public.leave_requests
  FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create leave requests" ON public.leave_requests
  FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND staff_user_id = auth.uid());

CREATE POLICY "Users can update leave requests in their org" ON public.leave_requests
  FOR UPDATE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Field Check-ins
CREATE POLICY "Users can view check-ins in their org" ON public.field_check_ins
  FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create check-ins" ON public.field_check_ins
  FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND staff_user_id = auth.uid());

CREATE POLICY "Users can update their check-ins" ON public.field_check_ins
  FOR UPDATE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id) AND staff_user_id = auth.uid());

-- Staff Tasks
CREATE POLICY "Users can view tasks in their org" ON public.staff_tasks
  FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create tasks in their org" ON public.staff_tasks
  FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update tasks in their org" ON public.staff_tasks
  FOR UPDATE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete tasks in their org" ON public.staff_tasks
  FOR DELETE TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Task Comments
CREATE POLICY "Users can view task comments" ON public.task_comments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff_tasks t WHERE t.id = task_id AND public.user_belongs_to_org(auth.uid(), t.organization_id))
  );

CREATE POLICY "Users can create task comments" ON public.task_comments
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.staff_tasks t WHERE t.id = task_id AND public.user_belongs_to_org(auth.uid(), t.organization_id))
  );

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================
CREATE TRIGGER update_staff_performance_contracts_updated_at BEFORE UPDATE ON public.staff_performance_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_contract_objectives_updated_at BEFORE UPDATE ON public.staff_contract_objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON public.leave_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_tasks_updated_at BEFORE UPDATE ON public.staff_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_staff_contracts_org ON public.staff_performance_contracts(organization_id);
CREATE INDEX idx_staff_contracts_user ON public.staff_performance_contracts(staff_user_id);
CREATE INDEX idx_leave_requests_org ON public.leave_requests(organization_id);
CREATE INDEX idx_leave_requests_user ON public.leave_requests(staff_user_id);
CREATE INDEX idx_field_check_ins_org ON public.field_check_ins(organization_id);
CREATE INDEX idx_field_check_ins_user ON public.field_check_ins(staff_user_id);
CREATE INDEX idx_staff_tasks_org ON public.staff_tasks(organization_id);
CREATE INDEX idx_staff_tasks_assigned ON public.staff_tasks(assigned_to);
CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);
