
-- Logframes
CREATE TABLE IF NOT EXISTS public.programme_logframes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  goal TEXT,
  goal_indicator TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_programme_logframes_program ON public.programme_logframes(program_id);
ALTER TABLE public.programme_logframes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logframes_select" ON public.programme_logframes FOR SELECT USING (public.user_belongs_to_org(auth.uid(), org_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "logframes_insert" ON public.programme_logframes FOR INSERT WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "logframes_update" ON public.programme_logframes FOR UPDATE USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "logframes_delete" ON public.programme_logframes FOR DELETE USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE TRIGGER trg_logframes_updated_at BEFORE UPDATE ON public.programme_logframes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Logframe entries
CREATE TABLE IF NOT EXISTS public.logframe_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('goal','outcome','output','activity','input')),
  title TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.logframe_entries(id) ON DELETE SET NULL,
  indicator_ids UUID[] DEFAULT ARRAY[]::UUID[],
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);
CREATE INDEX IF NOT EXISTS idx_lfe_program ON public.logframe_entries(program_id);
CREATE INDEX IF NOT EXISTS idx_lfe_parent ON public.logframe_entries(parent_id);
ALTER TABLE public.logframe_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lfe_select" ON public.logframe_entries FOR SELECT USING (public.user_belongs_to_org(auth.uid(), org_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lfe_insert" ON public.logframe_entries FOR INSERT WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "lfe_update" ON public.logframe_entries FOR UPDATE USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "lfe_delete" ON public.logframe_entries FOR DELETE USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE TRIGGER trg_lfe_updated_at BEFORE UPDATE ON public.logframe_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Programme team
CREATE TABLE IF NOT EXISTS public.programme_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('programme_manager','project_manager','field_officer','me_officer','finance_officer','data_entry','advisor','other')),
  role_label TEXT,
  is_lead BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT pteam_program_or_project CHECK (program_id IS NOT NULL OR project_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_pteam_program ON public.programme_team(program_id);
CREATE INDEX IF NOT EXISTS idx_pteam_project ON public.programme_team(project_id);
CREATE INDEX IF NOT EXISTS idx_pteam_staff ON public.programme_team(staff_id);
ALTER TABLE public.programme_team ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pteam_select" ON public.programme_team FOR SELECT USING (public.user_belongs_to_org(auth.uid(), org_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pteam_insert" ON public.programme_team FOR INSERT WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "pteam_update" ON public.programme_team FOR UPDATE USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "pteam_delete" ON public.programme_team FOR DELETE USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE TRIGGER trg_pteam_updated_at BEFORE UPDATE ON public.programme_team FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Programme milestones
CREATE TABLE IF NOT EXISTS public.programme_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','in_progress','completed','overdue','cancelled')),
  milestone_type TEXT NOT NULL DEFAULT 'general' CHECK (milestone_type IN ('general','report','evaluation','disbursement','review','launch','close')),
  assigned_to UUID,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_milestones_program ON public.programme_milestones(program_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.programme_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due ON public.programme_milestones(due_date);
ALTER TABLE public.programme_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ms_select" ON public.programme_milestones FOR SELECT USING (public.user_belongs_to_org(auth.uid(), org_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ms_insert" ON public.programme_milestones FOR INSERT WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "ms_update" ON public.programme_milestones FOR UPDATE USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE POLICY "ms_delete" ON public.programme_milestones FOR DELETE USING (public.user_belongs_to_org(auth.uid(), org_id));
CREATE TRIGGER trg_milestones_updated_at BEFORE UPDATE ON public.programme_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend pre-existing me_data_schedule
ALTER TABLE public.me_data_schedule
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS frequency TEXT,
  ADD COLUMN IF NOT EXISTS collection_method TEXT,
  ADD COLUMN IF NOT EXISTS responsible_staff_id UUID,
  ADD COLUMN IF NOT EXISTS next_collection_date DATE,
  ADD COLUMN IF NOT EXISTS last_collected_date DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_mes_program ON public.me_data_schedule(program_id);
CREATE INDEX IF NOT EXISTS idx_mes_next ON public.me_data_schedule(next_collection_date);

-- Extend activities
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.programme_milestones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actual_start_date DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE,
  ADD COLUMN IF NOT EXISTS depends_on UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS location_county TEXT,
  ADD COLUMN IF NOT EXISTS location_sub_county TEXT;

-- Extend projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS target_beneficiaries INTEGER,
  ADD COLUMN IF NOT EXISTS project_manager_id UUID,
  ADD COLUMN IF NOT EXISTS geographic_focus TEXT[],
  ADD COLUMN IF NOT EXISTS theory_of_change TEXT,
  ADD COLUMN IF NOT EXISTS donor_visibility TEXT NOT NULL DEFAULT 'programme' CHECK (donor_visibility IN ('programme','project','activity'));

-- Extend programs
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS primary_sector TEXT,
  ADD COLUMN IF NOT EXISTS secondary_sectors TEXT[],
  ADD COLUMN IF NOT EXISTS total_budget NUMERIC(16,2),
  ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS logframe_status TEXT NOT NULL DEFAULT 'draft' CHECK (logframe_status IN ('draft','submitted','approved'));
