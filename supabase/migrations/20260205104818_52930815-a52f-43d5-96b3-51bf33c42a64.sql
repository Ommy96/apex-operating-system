-- Add custom fields columns to existing projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS project_code TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;