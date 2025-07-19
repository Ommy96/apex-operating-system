-- Add active/inactive status field to self_empowerment table
ALTER TABLE public.self_empowerment 
ADD COLUMN is_active BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.self_empowerment.is_active IS 'Business active status to track if business is currently operational';

-- Create loan_repayments table for tracking loan repayments
CREATE TABLE public.loan_repayments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  self_empowerment_id UUID NOT NULL REFERENCES public.self_empowerment(id) ON DELETE CASCADE,
  repayment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paid DECIMAL(10,2) NOT NULL CHECK (amount_paid > 0),
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  balance_after_payment DECIMAL(10,2),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.loan_repayments IS 'Tracks loan repayments for self-empowerment program';
COMMENT ON COLUMN public.loan_repayments.self_empowerment_id IS 'Reference to the self-empowerment record';
COMMENT ON COLUMN public.loan_repayments.amount_paid IS 'Amount paid in this repayment';
COMMENT ON COLUMN public.loan_repayments.balance_after_payment IS 'Remaining balance after this payment';

-- Enable RLS on loan_repayments table
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for loan_repayments
CREATE POLICY "Authenticated users can view loan repayments" 
ON public.loan_repayments 
FOR SELECT 
USING (true);

CREATE POLICY "Coordinators and admins can manage loan repayments" 
ON public.loan_repayments 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role]));

-- Create trigger for automatic timestamp updates on loan_repayments
CREATE TRIGGER update_loan_repayments_updated_at
BEFORE UPDATE ON public.loan_repayments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();