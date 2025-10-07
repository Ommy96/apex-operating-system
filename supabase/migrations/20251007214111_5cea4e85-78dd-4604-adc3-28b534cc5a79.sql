-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  month text NOT NULL,
  week integer NOT NULL CHECK (week >= 1 AND week <= 5),
  present_count integer NOT NULL DEFAULT 0 CHECK (present_count >= 0),
  absent_count integer NOT NULL DEFAULT 0 CHECK (absent_count >= 0),
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for attendance_records
CREATE POLICY "Admins can manage attendance records"
ON public.attendance_records
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Authenticated users can view attendance records"
ON public.attendance_records
FOR SELECT
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_attendance_program_id ON public.attendance_records(program_id);
CREATE INDEX idx_attendance_month ON public.attendance_records(month);