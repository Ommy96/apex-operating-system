
-- Add custom_fields column to programs table to store field definitions
ALTER TABLE public.programs 
ADD COLUMN custom_fields jsonb DEFAULT '[]'::jsonb;

-- Add show_in_navigation column to control sidebar visibility
ALTER TABLE public.programs 
ADD COLUMN show_in_navigation boolean DEFAULT false;

-- Create program_entries table for storing dynamic program data
CREATE TABLE public.program_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.program_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for program_entries
CREATE POLICY "Admins can manage program entries"
ON public.program_entries
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Authenticated users can view program entries"
ON public.program_entries
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_program_entries_updated_at
BEFORE UPDATE ON public.program_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_program_entries_program_id ON public.program_entries(program_id);

-- Add comment for documentation
COMMENT ON COLUMN public.programs.custom_fields IS 'JSON array of field definitions: [{name, type, required, options}]';
COMMENT ON COLUMN public.program_entries.data IS 'JSON object with field values matching program custom_fields';
