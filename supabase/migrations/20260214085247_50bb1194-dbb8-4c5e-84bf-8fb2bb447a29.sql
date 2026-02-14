-- Add organization_type and county/region columns to organizations table
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS organization_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS county text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS registration_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
