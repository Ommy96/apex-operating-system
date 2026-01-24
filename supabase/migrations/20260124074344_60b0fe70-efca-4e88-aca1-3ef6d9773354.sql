-- Phase 2: Create academic_performance table for tracking child academic records

CREATE TABLE public.academic_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  subject TEXT,
  score NUMERIC(5,2),
  grade TEXT,
  remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.academic_performance ENABLE ROW LEVEL SECURITY;

-- Create policies for organization-based access
CREATE POLICY "Users can view academic records in their organization"
ON public.academic_performance
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create academic records in their organization"
ON public.academic_performance
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update academic records in their organization"
ON public.academic_performance
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete academic records in their organization"
ON public.academic_performance
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Create indexes for common queries
CREATE INDEX idx_academic_performance_child ON public.academic_performance(child_id);
CREATE INDEX idx_academic_performance_org ON public.academic_performance(organization_id);
CREATE INDEX idx_academic_performance_year_term ON public.academic_performance(academic_year, term);

-- Add trigger for updated_at
CREATE TRIGGER update_academic_performance_updated_at
BEFORE UPDATE ON public.academic_performance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.academic_performance IS 'Stores individual academic performance records for children';
COMMENT ON COLUMN public.academic_performance.term IS 'Academic term (e.g., Term 1, Term 2, Term 3)';
COMMENT ON COLUMN public.academic_performance.subject IS 'Subject name or Overall for aggregate scores';
COMMENT ON COLUMN public.academic_performance.score IS 'Numeric score (0-100)';
COMMENT ON COLUMN public.academic_performance.grade IS 'Letter grade (e.g., A, B, C, D, E)';