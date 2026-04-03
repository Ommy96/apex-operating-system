
-- Sprint 4: M&E Completeness & Reporting Engine

-- TASK 1: M&E Data Collection Schedule
CREATE TABLE IF NOT EXISTS public.me_data_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  collection_frequency TEXT NOT NULL CHECK (collection_frequency IN ('monthly','quarterly','biannual','annual')),
  next_due_date DATE NOT NULL,
  last_collected_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, indicator_id)
);
ALTER TABLE public.me_data_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage me_data_schedule" ON public.me_data_schedule
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE INDEX IF NOT EXISTS idx_me_data_schedule_org ON public.me_data_schedule(org_id);

-- TASK 2: Disaggregation Framework
CREATE TABLE IF NOT EXISTS public.disaggregation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  values JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.disaggregation_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage disaggregation_categories" ON public.disaggregation_categories
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE INDEX IF NOT EXISTS idx_disaggregation_categories_org ON public.disaggregation_categories(org_id);

CREATE TABLE IF NOT EXISTS public.indicator_disaggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  disaggregation_category_id UUID NOT NULL REFERENCES public.disaggregation_categories(id) ON DELETE CASCADE,
  UNIQUE(indicator_id, disaggregation_category_id)
);
ALTER TABLE public.indicator_disaggregations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage indicator_disaggregations" ON public.indicator_disaggregations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.indicators i WHERE i.id = indicator_id AND public.user_belongs_to_org(auth.uid(), i.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.indicators i WHERE i.id = indicator_id AND public.user_belongs_to_org(auth.uid(), i.organization_id)
  ));

-- Add disaggregation + notes columns to indicator_values
ALTER TABLE public.indicator_values ADD COLUMN IF NOT EXISTS disaggregation_category_id UUID REFERENCES public.disaggregation_categories(id);
ALTER TABLE public.indicator_values ADD COLUMN IF NOT EXISTS disaggregation_value TEXT;
ALTER TABLE public.indicator_values ADD COLUMN IF NOT EXISTS notes TEXT;

-- TASK 3: Project Team Assignment
CREATE TABLE IF NOT EXISTS public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  role_on_project TEXT DEFAULT 'team_member' CHECK (role_on_project IN ('lead','coordinator','field_officer','me_officer','finance','team_member')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage project_team_members" ON public.project_team_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.user_belongs_to_org(auth.uid(), p.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.user_belongs_to_org(auth.uid(), p.organization_id)
  ));
CREATE INDEX IF NOT EXISTS idx_project_team_members_project ON public.project_team_members(project_id);

-- TASK 4: Add planned dates to activities for Gantt chart
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS planned_start_date DATE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS planned_end_date DATE;

-- TASK 6: Indicator Validation Rules
CREATE TABLE IF NOT EXISTS public.indicator_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('min_value','max_value','max_change_pct','require_comment_if_zero')),
  rule_value DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator_id, rule_type)
);
ALTER TABLE public.indicator_validation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage indicator_validation_rules" ON public.indicator_validation_rules
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.indicators i WHERE i.id = indicator_id AND public.user_belongs_to_org(auth.uid(), i.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.indicators i WHERE i.id = indicator_id AND public.user_belongs_to_org(auth.uid(), i.organization_id)
  ));

-- TASK 7: Lessons Learned
CREATE TABLE IF NOT EXISTS public.lessons_learned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.projects(id),
  title TEXT NOT NULL,
  context TEXT,
  what_worked TEXT,
  what_didnt_work TEXT,
  recommendation TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.lessons_learned ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage lessons_learned" ON public.lessons_learned
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE INDEX IF NOT EXISTS idx_lessons_learned_org ON public.lessons_learned(org_id);

-- TASK 8: Impact Stories
CREATE TABLE IF NOT EXISTS public.impact_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  title TEXT NOT NULL,
  beneficiary_id UUID REFERENCES public.beneficiaries(id),
  project_id UUID REFERENCES public.projects(id),
  author_id UUID REFERENCES public.profiles(user_id),
  story_text TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  theme TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.impact_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage impact_stories" ON public.impact_stories
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND deleted_at IS NULL)
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE INDEX IF NOT EXISTS idx_impact_stories_org ON public.impact_stories(org_id);

-- Storage bucket for impact story photos
INSERT INTO storage.buckets (id, name, public) VALUES ('impact-stories', 'impact-stories', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Upload impact story photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'impact-stories');

CREATE POLICY "View impact story photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'impact-stories');

-- RBAC permissions for new modules (with required NOT NULL fields)
INSERT INTO public.rbac_permissions (module, module_display_name, action, resource, display_name, description) VALUES
  ('me', 'M&E', 'manage', 'data_schedule', 'Manage Data Schedules', 'Manage M&E data collection schedules'),
  ('me', 'M&E', 'manage', 'disaggregation', 'Manage Disaggregation', 'Manage disaggregation categories'),
  ('programs', 'Programs', 'manage', 'project_team', 'Manage Project Team', 'Manage project team assignments'),
  ('me', 'M&E', 'manage', 'validation_rules', 'Manage Validation Rules', 'Manage indicator validation rules'),
  ('programs', 'Programs', 'view', 'lessons_learned', 'View Lessons Learned', 'View lessons learned'),
  ('programs', 'Programs', 'manage', 'lessons_learned', 'Manage Lessons Learned', 'Manage lessons learned'),
  ('programs', 'Programs', 'view', 'impact_stories', 'View Impact Stories', 'View impact stories'),
  ('programs', 'Programs', 'manage', 'impact_stories', 'Manage Impact Stories', 'Manage impact stories')
ON CONFLICT DO NOTHING;

-- Auto-assign new permissions to org_admin roles
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
CROSS JOIN public.rbac_permissions p
WHERE r.name = 'org_admin'
  AND p.module IN ('me', 'programs')
  AND p.resource IN ('data_schedule', 'disaggregation', 'project_team', 'validation_rules', 'lessons_learned', 'impact_stories')
ON CONFLICT DO NOTHING;
