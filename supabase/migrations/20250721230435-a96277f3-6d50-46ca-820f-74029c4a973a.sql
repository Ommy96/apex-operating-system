-- Create settings table to store system settings
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings
CREATE POLICY "Admins can manage settings" 
ON public.settings 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Authenticated users can view settings" 
ON public.settings 
FOR SELECT 
USING (true);

-- Insert default settings
INSERT INTO public.settings (key, value, description) VALUES 
('system_name', '"Heart 2 Heart Foundation"', 'Organization name'),
('notification_email', '"admin@heart2heart.org"', 'Default notification email'),
('backup_frequency', '"daily"', 'Backup frequency setting'),
('maintenance_mode', 'false', 'Maintenance mode toggle');

-- Add trigger for updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();