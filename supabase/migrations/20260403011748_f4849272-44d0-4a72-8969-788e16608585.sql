
-- Sprint 3: Financial & Grant Completeness

-- 1. currency_rates
CREATE TABLE public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency CHAR(3) NOT NULL,
  target_currency CHAR(3) NOT NULL,
  rate DECIMAL(18,6) NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read rates" ON public.currency_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage rates" ON public.currency_rates FOR ALL TO service_role USING (true);

-- 2. Add base_currency to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS base_currency CHAR(3) DEFAULT 'KES';

-- 3. cash_transfer_batches
CREATE TABLE public.cash_transfer_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  grant_id UUID REFERENCES public.grants(id),
  project_id UUID REFERENCES public.projects(id),
  batch_name TEXT NOT NULL,
  total_recipients INT DEFAULT 0,
  total_amount_kes DECIMAL(14,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cash_transfer_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view batches" ON public.cash_transfer_batches FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members can create batches" ON public.cash_transfer_batches FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members can update batches" ON public.cash_transfer_batches FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

-- 4. cash_transfers
CREATE TABLE public.cash_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  batch_id UUID REFERENCES public.cash_transfer_batches(id),
  grant_id UUID REFERENCES public.grants(id),
  project_id UUID REFERENCES public.projects(id),
  batch_name TEXT,
  beneficiary_id UUID REFERENCES public.beneficiaries(id),
  recipient_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount_kes DECIMAL(12,2) NOT NULL,
  purpose TEXT,
  mpesa_transaction_id TEXT,
  mpesa_result_code TEXT,
  mpesa_result_desc TEXT,
  status TEXT DEFAULT 'pending',
  initiated_by UUID,
  initiated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cash_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view transfers" ON public.cash_transfers FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members can create transfers" ON public.cash_transfers FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members can update transfers" ON public.cash_transfers FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE INDEX idx_cash_transfers_org ON public.cash_transfers(org_id);
CREATE INDEX idx_cash_transfers_batch ON public.cash_transfers(batch_id);
CREATE INDEX idx_cash_transfers_status ON public.cash_transfers(status);

-- 5. grant_reminder_logs
CREATE TABLE public.grant_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_report_id UUID NOT NULL REFERENCES public.grant_reports(id),
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_to TEXT[],
  channel TEXT DEFAULT 'email'
);
ALTER TABLE public.grant_reminder_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view reminder logs" ON public.grant_reminder_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.grant_reports gr
    JOIN public.grants g ON g.id = gr.grant_id
    WHERE gr.id = grant_report_id AND public.user_belongs_to_org(auth.uid(), g.organization_id)
  ));

-- 6. expense_claims
CREATE TABLE public.expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  staff_id UUID NOT NULL,
  grant_id UUID REFERENCES public.grants(id),
  project_id UUID REFERENCES public.projects(id),
  claim_title TEXT NOT NULL,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) DEFAULT 'KES',
  status TEXT DEFAULT 'draft',
  items JSONB DEFAULT '[]',
  receipt_urls TEXT[] DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own claims" ON public.expense_claims FOR SELECT TO authenticated
  USING (staff_id = auth.uid() OR public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Staff can create own claims" ON public.expense_claims FOR INSERT TO authenticated
  WITH CHECK (staff_id = auth.uid() AND public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Staff can update own draft claims" ON public.expense_claims FOR UPDATE TO authenticated
  USING (
    (staff_id = auth.uid() AND status = 'draft')
    OR public.user_has_permission(auth.uid(), org_id, 'financial', 'manage', 'expense_claims')
  );
CREATE INDEX idx_expense_claims_org ON public.expense_claims(org_id);
CREATE INDEX idx_expense_claims_staff ON public.expense_claims(staff_id);
CREATE INDEX idx_expense_claims_status ON public.expense_claims(status);

-- 7. petty_cash_funds
CREATE TABLE public.petty_cash_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.projects(id),
  fund_name TEXT NOT NULL,
  custodian_id UUID,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) DEFAULT 'KES',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.petty_cash_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view funds" ON public.petty_cash_funds FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members can manage funds" ON public.petty_cash_funds FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "Org members can update funds" ON public.petty_cash_funds FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id));

-- 8. petty_cash_transactions
CREATE TABLE public.petty_cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES public.petty_cash_funds(id),
  transaction_type TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  recorded_by UUID,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.petty_cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view petty cash txns" ON public.petty_cash_transactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.petty_cash_funds f WHERE f.id = fund_id AND public.user_belongs_to_org(auth.uid(), f.org_id)
  ));
CREATE POLICY "Org members can create petty cash txns" ON public.petty_cash_transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.petty_cash_funds f WHERE f.id = fund_id AND public.user_belongs_to_org(auth.uid(), f.org_id)
  ));

-- Trigger: auto-update petty cash fund balance
CREATE OR REPLACE FUNCTION public.update_petty_cash_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.transaction_type = 'disbursement' THEN
    UPDATE public.petty_cash_funds SET current_balance = current_balance - NEW.amount WHERE id = NEW.fund_id;
  ELSIF NEW.transaction_type = 'replenishment' THEN
    UPDATE public.petty_cash_funds SET current_balance = current_balance + NEW.amount WHERE id = NEW.fund_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    UPDATE public.petty_cash_funds SET current_balance = NEW.amount WHERE id = NEW.fund_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_petty_cash_balance
AFTER INSERT ON public.petty_cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_petty_cash_balance();

-- 9. RBAC permissions for new modules
INSERT INTO public.rbac_permissions (module, module_display_name, action, resource, display_name, description)
VALUES
  ('financial', 'Financial', 'manage', 'cash_transfers', 'Manage Cash Transfers', 'Create and manage M-Pesa cash transfers'),
  ('financial', 'Financial', 'approve', 'cash_transfers', 'Approve Cash Transfers', 'Approve cash transfer batches'),
  ('financial', 'Financial', 'manage', 'expense_claims', 'Manage Expense Claims', 'Manage staff expense claims'),
  ('financial', 'Financial', 'approve', 'expense_claims', 'Approve Expense Claims', 'Approve or reject expense claims'),
  ('financial', 'Financial', 'manage', 'petty_cash', 'Manage Petty Cash', 'Manage petty cash funds and transactions')
ON CONFLICT DO NOTHING;

-- Auto-assign new permissions to org_admin roles
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
CROSS JOIN public.rbac_permissions p
WHERE r.name = 'org_admin'
  AND p.module = 'financial'
  AND p.action IN ('manage', 'approve')
  AND p.resource IN ('cash_transfers', 'expense_claims', 'petty_cash')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX idx_cash_transfer_batches_org ON public.cash_transfer_batches(org_id);
CREATE INDEX idx_petty_cash_funds_org ON public.petty_cash_funds(org_id);
CREATE INDEX idx_grant_reminder_logs_report ON public.grant_reminder_logs(grant_report_id);
