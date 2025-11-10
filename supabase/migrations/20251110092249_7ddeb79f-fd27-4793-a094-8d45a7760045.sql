-- Create academic history table to track grade progressions
CREATE TABLE public.academic_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  previous_grade TEXT,
  new_grade TEXT NOT NULL,
  previous_academic_level TEXT,
  new_academic_level TEXT,
  progression_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.academic_history ENABLE ROW LEVEL SECURITY;

-- Admins can manage academic history
CREATE POLICY "Admins can manage academic history"
  ON public.academic_history
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Authenticated users can view academic history
CREATE POLICY "Authenticated users can view academic history"
  ON public.academic_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create index for better query performance
CREATE INDEX idx_academic_history_child_id ON public.academic_history(child_id);
CREATE INDEX idx_academic_history_academic_year ON public.academic_history(academic_year);