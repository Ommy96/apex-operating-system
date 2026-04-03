
-- Add primary_color to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7);

-- Create org-logos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org logos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'org-logos');
CREATE POLICY "Authenticated users can upload org logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'org-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update org logos" ON storage.objects FOR UPDATE USING (bucket_id = 'org-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete org logos" ON storage.objects FOR DELETE USING (bucket_id = 'org-logos' AND auth.role() = 'authenticated');

-- Seed default disaggregation categories for new orgs
CREATE OR REPLACE FUNCTION public.seed_default_disaggregation_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.disaggregation_categories (org_id, name, values) VALUES
    (NEW.id, 'Gender', '["Male","Female","Non-binary","Prefer not to say"]'::jsonb),
    (NEW.id, 'Age Group', '["0-5","6-17","18-35","36-60","60+"]'::jsonb),
    (NEW.id, 'Disability Status', '["With disability","Without disability"]'::jsonb),
    (NEW.id, 'Location Type', '["Urban","Peri-urban","Rural"]'::jsonb)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_disaggregation_categories
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_disaggregation_categories();
