-- Create support group activities table
CREATE TABLE public.support_group_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  support_group_id UUID NOT NULL REFERENCES public.support_groups(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  description TEXT,
  frequency TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.support_group_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for support group activities
CREATE POLICY "Authenticated users can view support group activities" 
ON public.support_group_activities 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage support group activities" 
ON public.support_group_activities 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_support_group_activities_updated_at
BEFORE UPDATE ON public.support_group_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();