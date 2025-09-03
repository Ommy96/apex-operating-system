-- Create replacements table to track child replacements
CREATE TABLE public.replacements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_child_id uuid NOT NULL,
  new_child_full_name text NOT NULL,
  new_child_gender gender,
  new_child_location residence,
  new_child_school text,
  new_child_grade text,
  replacement_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.replacements ENABLE ROW LEVEL SECURITY;

-- Create policies for replacements
CREATE POLICY "Admins can manage replacements" 
ON public.replacements 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Authenticated users can view replacements" 
ON public.replacements 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_replacements_updated_at
BEFORE UPDATE ON public.replacements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_replacements_original_child_id ON public.replacements(original_child_id);
CREATE INDEX idx_replacements_replacement_date ON public.replacements(replacement_date);

-- Add a status field to children table to track replacements
ALTER TABLE public.children 
ADD COLUMN replacement_status text DEFAULT 'active';

-- Update existing children to have 'active' status
UPDATE public.children SET replacement_status = 'active' WHERE replacement_status IS NULL;