-- =====================================================
-- ENHANCED PROGRAMS & REPORTS SYSTEM
-- =====================================================

-- 1. Program Modules Table - allows programs to have sub-pages/modules
CREATE TABLE public.program_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  slug text NOT NULL,
  icon text DEFAULT 'FileText',
  custom_fields jsonb DEFAULT '[]'::jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(program_id, slug)
);

-- 2. Module Entries - stores data for each module (organization_id must be provided explicitly)
CREATE TABLE public.module_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.program_modules(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.children(id) ON DELETE SET NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  organization_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Report Templates Table - allows admins to create custom report templates
CREATE TABLE public.report_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  header_config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Report Entries - stores submitted reports
CREATE TABLE public.report_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'draft',
  submitted_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Program Report Types - links report templates to specific programs
CREATE TABLE public.program_report_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  is_required boolean DEFAULT false,
  frequency text DEFAULT 'as_needed',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(program_id, template_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.program_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_report_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for program_modules (follow program's organization)
CREATE POLICY "Users can view program modules of their org programs"
  ON public.program_modules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_modules.program_id
    AND p.organization_id = get_user_organization_id(auth.uid())
  ));

CREATE POLICY "Admins can insert program modules"
  ON public.program_modules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_modules.program_id
    AND p.organization_id = get_user_organization_id(auth.uid())
  ) AND (
    get_org_member_role(auth.uid(), (SELECT organization_id FROM programs WHERE id = program_modules.program_id)) IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update program modules"
  ON public.program_modules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_modules.program_id
    AND p.organization_id = get_user_organization_id(auth.uid())
  ));

CREATE POLICY "Admins can delete program modules"
  ON public.program_modules FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_modules.program_id
    AND p.organization_id = get_user_organization_id(auth.uid())
  ) AND get_user_role(auth.uid()) = 'admin');

-- RLS Policies for module_entries
CREATE POLICY "Users can view module entries of their org"
  ON public.module_entries FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert module entries"
  ON public.module_entries FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update module entries of their org"
  ON public.module_entries FOR UPDATE
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can delete module entries"
  ON public.module_entries FOR DELETE
  USING (organization_id = get_user_organization_id(auth.uid()) AND get_user_role(auth.uid()) = 'admin');

-- RLS Policies for report_templates
CREATE POLICY "Users can view report templates of their org"
  ON public.report_templates FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can insert report templates"
  ON public.report_templates FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()) AND get_user_role(auth.uid()) IN ('admin', 'management'));

CREATE POLICY "Admins can update report templates"
  ON public.report_templates FOR UPDATE
  USING (organization_id = get_user_organization_id(auth.uid()) AND get_user_role(auth.uid()) IN ('admin', 'management'));

CREATE POLICY "Admins can delete report templates"
  ON public.report_templates FOR DELETE
  USING (organization_id = get_user_organization_id(auth.uid()) AND get_user_role(auth.uid()) = 'admin');

-- RLS Policies for report_entries
CREATE POLICY "Users can view report entries of their org"
  ON public.report_entries FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert report entries"
  ON public.report_entries FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update report entries of their org"
  ON public.report_entries FOR UPDATE
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can delete report entries"
  ON public.report_entries FOR DELETE
  USING (organization_id = get_user_organization_id(auth.uid()) AND get_user_role(auth.uid()) = 'admin');

-- RLS Policies for program_report_types
CREATE POLICY "Users can view program report types"
  ON public.program_report_types FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_report_types.program_id
    AND p.organization_id = get_user_organization_id(auth.uid())
  ));

CREATE POLICY "Admins can insert program report types"
  ON public.program_report_types FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'management'));

CREATE POLICY "Admins can update program report types"
  ON public.program_report_types FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('admin', 'management'));

CREATE POLICY "Admins can delete program report types"
  ON public.program_report_types FOR DELETE
  USING (get_user_role(auth.uid()) = 'admin');

-- Add triggers for updated_at
CREATE TRIGGER update_program_modules_updated_at
  BEFORE UPDATE ON public.program_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_module_entries_updated_at
  BEFORE UPDATE ON public.module_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_entries_updated_at
  BEFORE UPDATE ON public.report_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();