-- Create business visit reports table
CREATE TABLE public.business_visit_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff TEXT NOT NULL,
  business_id UUID REFERENCES public.self_empowerment(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  location TEXT,
  reason_for_visit TEXT,
  observation_findings TEXT NOT NULL,
  challenges_identified TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.business_visit_reports ENABLE ROW LEVEL SECURITY;

-- Create policies similar to school_visit_reports and home_visit_reports
CREATE POLICY "Authenticated users can view business visit reports" 
ON public.business_visit_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and management can manage all business visit reports" 
ON public.business_visit_reports 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'management'::user_role]));

CREATE POLICY "Staff can create and view their own business visit reports" 
ON public.business_visit_reports 
FOR ALL 
USING (
  CASE
    WHEN get_user_role(auth.uid()) = 'staff'::user_role THEN created_by = auth.uid()
    ELSE true
  END
);

-- Add trigger for updated_at
CREATE TRIGGER update_business_visit_reports_updated_at
BEFORE UPDATE ON public.business_visit_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();