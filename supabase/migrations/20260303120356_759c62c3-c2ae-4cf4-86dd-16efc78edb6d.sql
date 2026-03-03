
-- Create beneficiary_progression_history table for academic lifecycle tracking
CREATE TABLE public.beneficiary_progression_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  previous_academic_level TEXT,
  previous_grade TEXT,
  new_academic_level TEXT,
  new_grade TEXT,
  progression_type TEXT NOT NULL DEFAULT 'automatic', -- 'automatic', 'manual', 'repeat', 'skip'
  progression_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_repeating BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beneficiary_progression_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view progression history for their org"
ON public.beneficiary_progression_history
FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert progression history for their org"
ON public.beneficiary_progression_history
FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update progression history for their org"
ON public.beneficiary_progression_history
FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

-- Index for fast lookups
CREATE INDEX idx_progression_history_beneficiary ON public.beneficiary_progression_history(beneficiary_id);
CREATE INDEX idx_progression_history_org ON public.beneficiary_progression_history(organization_id);
CREATE INDEX idx_progression_history_year ON public.beneficiary_progression_history(academic_year);
