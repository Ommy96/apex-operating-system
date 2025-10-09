-- Create medical records table
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT,
  medical_condition TEXT NOT NULL,
  hospital TEXT NOT NULL,
  academic_level TEXT,
  doctors_report TEXT,
  outcome TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- Create policies (same as Kipawa Sato)
CREATE POLICY "Admins can manage medical records"
ON public.medical_records
FOR ALL
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Authenticated users can view medical records"
ON public.medical_records
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_medical_records_updated_at
BEFORE UPDATE ON public.medical_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();