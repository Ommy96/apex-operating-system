
-- =====================================================
-- FINANCIAL SUITE: Budget Planning, Expense Tracking, 
-- Grant Management, Cost-Per-Beneficiary
-- =====================================================

-- 1. BUDGET CATEGORIES (reusable line-item categories)
CREATE TABLE public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES public.budget_categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. BUDGETS (program or project level budgets)
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  fiscal_year INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed','revised')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  revision_number INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. BUDGET LINE ITEMS
CREATE TABLE public.budget_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.budget_categories(id),
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  actual_spent NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. EXPENSES
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  budget_line_item_id UUID REFERENCES public.budget_line_items(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.budget_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor TEXT,
  receipt_url TEXT,
  receipt_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected','reimbursed')),
  submitted_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  reimbursement_date DATE,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. GRANTS
CREATE TABLE public.grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  grant_name TEXT NOT NULL,
  donor_name TEXT NOT NULL,
  donor_contact_email TEXT,
  donor_contact_phone TEXT,
  grant_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_received NUMERIC(15,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'pipeline' CHECK (status IN ('pipeline','application','submitted','under_review','approved','active','completed','rejected','expired')),
  application_deadline DATE,
  start_date DATE,
  end_date DATE,
  reporting_frequency TEXT DEFAULT 'quarterly',
  next_report_due DATE,
  description TEXT,
  objectives TEXT,
  compliance_notes TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. GRANT-PROGRAM LINKAGE
CREATE TABLE public.grant_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grant_id UUID NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(grant_id, program_id)
);

-- 7. GRANT COMPLIANCE CHECKLIST
CREATE TABLE public.grant_compliance_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grant_id UUID NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_compliance_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (tenant-isolated)
-- =====================================================

-- Budget Categories
CREATE POLICY "Users can view budget categories in their org"
ON public.budget_categories FOR SELECT TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert budget categories in their org"
ON public.budget_categories FOR INSERT TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update budget categories in their org"
ON public.budget_categories FOR UPDATE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete budget categories in their org"
ON public.budget_categories FOR DELETE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Budgets
CREATE POLICY "Users can view budgets in their org"
ON public.budgets FOR SELECT TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert budgets in their org"
ON public.budgets FOR INSERT TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update budgets in their org"
ON public.budgets FOR UPDATE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete budgets in their org"
ON public.budgets FOR DELETE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Budget Line Items (via budget's org)
CREATE POLICY "Users can view budget line items"
ON public.budget_line_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_id
  AND public.user_belongs_to_org(auth.uid(), b.organization_id)
));

CREATE POLICY "Users can insert budget line items"
ON public.budget_line_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_id
  AND public.user_belongs_to_org(auth.uid(), b.organization_id)
));

CREATE POLICY "Users can update budget line items"
ON public.budget_line_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_id
  AND public.user_belongs_to_org(auth.uid(), b.organization_id)
));

CREATE POLICY "Users can delete budget line items"
ON public.budget_line_items FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_id
  AND public.user_belongs_to_org(auth.uid(), b.organization_id)
));

-- Expenses
CREATE POLICY "Users can view expenses in their org"
ON public.expenses FOR SELECT TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert expenses in their org"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update expenses in their org"
ON public.expenses FOR UPDATE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete expenses in their org"
ON public.expenses FOR DELETE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Grants
CREATE POLICY "Users can view grants in their org"
ON public.grants FOR SELECT TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert grants in their org"
ON public.grants FOR INSERT TO authenticated
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update grants in their org"
ON public.grants FOR UPDATE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete grants in their org"
ON public.grants FOR DELETE TO authenticated
USING (public.user_belongs_to_org(auth.uid(), organization_id));

-- Grant Programs (via grant's org)
CREATE POLICY "Users can view grant programs"
ON public.grant_programs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.grants g
  WHERE g.id = grant_id
  AND public.user_belongs_to_org(auth.uid(), g.organization_id)
));

CREATE POLICY "Users can insert grant programs"
ON public.grant_programs FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.grants g
  WHERE g.id = grant_id
  AND public.user_belongs_to_org(auth.uid(), g.organization_id)
));

CREATE POLICY "Users can update grant programs"
ON public.grant_programs FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.grants g
  WHERE g.id = grant_id
  AND public.user_belongs_to_org(auth.uid(), g.organization_id)
));

CREATE POLICY "Users can delete grant programs"
ON public.grant_programs FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.grants g
  WHERE g.id = grant_id
  AND public.user_belongs_to_org(auth.uid(), g.organization_id)
));

-- Grant Compliance Items (via grant's org)
CREATE POLICY "Users can view grant compliance items"
ON public.grant_compliance_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.grants g
  WHERE g.id = grant_id
  AND public.user_belongs_to_org(auth.uid(), g.organization_id)
));

CREATE POLICY "Users can insert grant compliance items"
ON public.grant_compliance_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.grants g
  WHERE g.id = grant_id
  AND public.user_belongs_to_org(auth.uid(), g.organization_id)
));

CREATE POLICY "Users can update grant compliance items"
ON public.grant_compliance_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.grants g
  WHERE g.id = grant_id
  AND public.user_belongs_to_org(auth.uid(), g.organization_id)
));

CREATE POLICY "Users can delete grant compliance items"
ON public.grant_compliance_items FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.grants g
  WHERE g.id = grant_id
  AND public.user_belongs_to_org(auth.uid(), g.organization_id)
));

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_budget_categories_org ON public.budget_categories(organization_id);
CREATE INDEX idx_budgets_org ON public.budgets(organization_id);
CREATE INDEX idx_budgets_program ON public.budgets(program_id);
CREATE INDEX idx_budgets_project ON public.budgets(project_id);
CREATE INDEX idx_budget_line_items_budget ON public.budget_line_items(budget_id);
CREATE INDEX idx_expenses_org ON public.expenses(organization_id);
CREATE INDEX idx_expenses_budget ON public.expenses(budget_id);
CREATE INDEX idx_expenses_program ON public.expenses(program_id);
CREATE INDEX idx_expenses_status ON public.expenses(status);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_grants_org ON public.grants(organization_id);
CREATE INDEX idx_grants_status ON public.grants(status);
CREATE INDEX idx_grant_programs_grant ON public.grant_programs(grant_id);
CREATE INDEX idx_grant_programs_program ON public.grant_programs(program_id);
CREATE INDEX idx_grant_compliance_grant ON public.grant_compliance_items(grant_id);

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================
CREATE TRIGGER update_budget_categories_updated_at BEFORE UPDATE ON public.budget_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_line_items_updated_at BEFORE UPDATE ON public.budget_line_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_grants_updated_at BEFORE UPDATE ON public.grants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_grant_compliance_items_updated_at BEFORE UPDATE ON public.grant_compliance_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET for receipts
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Users can view receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts');

CREATE POLICY "Users can update receipts"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'receipts');

CREATE POLICY "Users can delete receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts');
