
-- =============================================
-- Central Financial Transactions Table
-- =============================================
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('beneficiary_support', 'program_grant', 'project_funding', 'expense', 'adjustment')),
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Linkable entities (all nullable for flexibility)
  donor_name TEXT,
  donor_id UUID REFERENCES public.beneficiary_donors(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  grant_id UUID REFERENCES public.grants(id) ON DELETE SET NULL,
  
  funding_category TEXT,
  description TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ft_org ON public.financial_transactions(organization_id);
CREATE INDEX idx_ft_type ON public.financial_transactions(transaction_type);
CREATE INDEX idx_ft_program ON public.financial_transactions(program_id);
CREATE INDEX idx_ft_beneficiary ON public.financial_transactions(beneficiary_id);
CREATE INDEX idx_ft_date ON public.financial_transactions(transaction_date);
CREATE INDEX idx_ft_donor_id ON public.financial_transactions(donor_id);

-- Updated_at trigger
CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org financial transactions"
  ON public.financial_transactions FOR SELECT
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admin/management can insert financial transactions"
  ON public.financial_transactions FOR INSERT
  WITH CHECK (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'management')
  );

CREATE POLICY "Admin/management can update financial transactions"
  ON public.financial_transactions FOR UPDATE
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'management')
  );

CREATE POLICY "Admin can delete financial transactions"
  ON public.financial_transactions FOR DELETE
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_org_member_role(auth.uid(), organization_id) = 'admin'
  );

-- =============================================
-- Auto-sync trigger: beneficiary_donors → financial_transactions
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_beneficiary_donor_to_financial()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_transactions (
      organization_id, transaction_type, amount, currency, transaction_date,
      donor_name, donor_id, program_id, beneficiary_id,
      funding_category, description, created_by
    ) VALUES (
      NEW.organization_id, 'beneficiary_support', COALESCE(NEW.amount_received, 0), 'KES',
      COALESCE(NEW.donation_date::date, CURRENT_DATE),
      NEW.donor_name, NEW.id, NEW.program_id, NEW.beneficiary_id,
      'Beneficiary Sponsorship', 'Donor support: ' || NEW.donor_name || ' for beneficiary',
      NEW.created_by
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.financial_transactions
    SET amount = COALESCE(NEW.amount_received, 0),
        donor_name = NEW.donor_name,
        program_id = NEW.program_id,
        transaction_date = COALESCE(NEW.donation_date::date, CURRENT_DATE),
        notes = NEW.notes
    WHERE donor_id = NEW.id AND transaction_type = 'beneficiary_support';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.financial_transactions
    WHERE donor_id = OLD.id AND transaction_type = 'beneficiary_support';
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_donor_to_financial
  AFTER INSERT OR UPDATE OR DELETE ON public.beneficiary_donors
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_beneficiary_donor_to_financial();

-- =============================================
-- Auto-sync trigger: expenses → financial_transactions
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_expense_to_financial()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_transactions (
      organization_id, transaction_type, amount, currency, transaction_date,
      program_id, project_id, expense_id,
      funding_category, description, created_by
    ) VALUES (
      NEW.organization_id, 'expense', COALESCE(NEW.amount, 0), COALESCE(NEW.currency, 'KES'),
      COALESCE(NEW.expense_date::date, CURRENT_DATE),
      NEW.program_id, NEW.project_id, NEW.id,
      COALESCE(NEW.payment_method, 'General'), NEW.title,
      NEW.created_by
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.financial_transactions
    SET amount = COALESCE(NEW.amount, 0),
        currency = COALESCE(NEW.currency, 'KES'),
        program_id = NEW.program_id,
        project_id = NEW.project_id,
        transaction_date = COALESCE(NEW.expense_date::date, CURRENT_DATE),
        description = NEW.title
    WHERE expense_id = NEW.id AND transaction_type = 'expense';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.financial_transactions
    WHERE expense_id = OLD.id AND transaction_type = 'expense';
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_expense_to_financial
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_expense_to_financial();
