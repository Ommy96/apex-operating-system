-- Add location column to programs table
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS location text;

-- Create sponsors table
CREATE TABLE IF NOT EXISTS public.sponsors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  country text,
  email text,
  phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on sponsors
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sponsors
CREATE POLICY "Admins can manage sponsors" 
ON public.sponsors 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Authenticated users can view sponsors" 
ON public.sponsors 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_sponsors_updated_at
BEFORE UPDATE ON public.sponsors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();