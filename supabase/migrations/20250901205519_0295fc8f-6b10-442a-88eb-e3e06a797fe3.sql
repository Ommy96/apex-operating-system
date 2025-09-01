-- Insert sample programs if they don't exist
INSERT INTO public.programs (name, description, is_active) VALUES
  ('Education', 'Educational support and sponsorship programs', true),
  ('Kibera Early Dinner', 'Evening meal program for children in Kibera', true),
  ('Kawangware Lunch Hour', 'Lunch program for children in Kawangware', true),
  ('Kipawa Sato', 'Skills and talents development program', true),
  ('Self-Empowerment', 'Microfinance and business development program', true),
  ('Support Groups', 'Community support and counseling groups', true)
ON CONFLICT (name) DO NOTHING;