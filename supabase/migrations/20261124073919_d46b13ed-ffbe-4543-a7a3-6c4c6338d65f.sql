
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  head_user_id uuid,
  data_reach text NOT NULL DEFAULT 'programmes' CHECK (data_reach IN ('organization','programmes')),
  modules text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX departments_org_idx ON public.departments(organization_id);
CREATE TABLE public.department_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_lead boolean NOT NULL DEFAULT false,
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX department_members_active_uq ON public.department_members(department_id, user_id) WHERE end_date IS NULL;
CREATE INDEX department_members_user_idx ON public.department_members(user_id, organization_id);
CREATE TABLE public.department_programmes (
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (department_id, program_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments, public.department_members, public.department_programmes TO authenticated;
GRANT ALL ON public.departments, public.department_members, public.department_programmes TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_programmes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_private.can_manage_staff_links(_user uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user = auth.uid() AND (public.user_is_org_elevated(_user,_org)
    OR public.user_has_permission(_user,_org,'roles','manage','roles')
    OR public.user_has_permission(_user,_org,'hr','manage','staff'))
$$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['departments','department_members','department_programmes'] LOOP
    EXECUTE format('CREATE POLICY %1$s_read ON public.%1$s FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id))', t);
    EXECUTE format('CREATE POLICY %1$s_write ON public.%1$s FOR ALL TO authenticated USING (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.can_manage_staff_links(auth.uid(), organization_id)) WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.can_manage_staff_links(auth.uid(), organization_id))', t);
  END LOOP;
END $$;
CREATE TRIGGER departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.project_team_members ADD COLUMN IF NOT EXISTS is_lead boolean NOT NULL DEFAULT false;
UPDATE public.project_team_members SET is_lead = true WHERE lower(coalesce(role_on_project,'')) IN ('lead','manager');
UPDATE public.programme_team SET is_lead = true WHERE lower(coalesce(role,'')) IN ('lead','manager') AND NOT is_lead;

-- ONE definition of scope
CREATE OR REPLACE FUNCTION app_private.user_scope_program_ids(_user uuid, _org uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(DISTINCT pid), '{}') FROM (
    SELECT pt.program_id pid FROM public.programme_team pt
     WHERE _user = auth.uid() AND pt.org_id=_org AND pt.staff_id=_user AND pt.project_id IS NULL
       AND (pt.start_date IS NULL OR pt.start_date <= current_date)
       AND (pt.end_date IS NULL OR pt.end_date > current_date)
    UNION
    SELECT dp.program_id FROM public.department_members dm
      JOIN public.departments d ON d.id=dm.department_id AND d.is_active AND d.data_reach='programmes'
      JOIN public.department_programmes dp ON dp.department_id=d.id
     WHERE _user = auth.uid() AND dm.organization_id=_org AND dm.user_id=_user
       AND dm.start_date <= current_date AND (dm.end_date IS NULL OR dm.end_date > current_date)
  ) s WHERE pid IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION app_private.user_scope_project_ids(_user uuid, _org uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(DISTINCT pid), '{}') FROM (
    SELECT ptm.project_id pid FROM public.project_team_members ptm JOIN public.projects pr ON pr.id=ptm.project_id
     WHERE _user = auth.uid() AND pr.organization_id=_org AND ptm.user_id=_user
       AND (ptm.start_date IS NULL OR ptm.start_date <= current_date)
       AND (ptm.end_date IS NULL OR ptm.end_date > current_date)
    UNION
    SELECT pt.project_id FROM public.programme_team pt
     WHERE _user = auth.uid() AND pt.org_id=_org AND pt.staff_id=_user AND pt.project_id IS NOT NULL
       AND (pt.start_date IS NULL OR pt.start_date <= current_date)
       AND (pt.end_date IS NULL OR pt.end_date > current_date)
    UNION
    SELECT pr.id FROM public.projects pr
     WHERE pr.organization_id=_org AND pr.program_id = ANY(app_private.user_scope_program_ids(_user,_org))
  ) s WHERE pid IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION app_private.user_has_org_reach(_user uuid, _org uuid, _module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND _user = auth.uid() AND (
    public.user_is_org_elevated(_user,_org)
    OR EXISTS (SELECT 1 FROM public.rbac_user_role_assignments a JOIN public.rbac_roles r ON r.id=a.role_id
               WHERE a.user_id=_user AND a.organization_id=_org AND a.is_active AND r.is_active
                 AND (r.data_scope='organization'
                      OR (lower(r.name) IN ('finance','finance_officer','finance_manager') AND _module IN ('grants','budgets','donations'))))
    OR EXISTS (SELECT 1 FROM public.department_members dm JOIN public.departments d ON d.id=dm.department_id
               WHERE dm.user_id=_user AND dm.organization_id=_org AND d.is_active AND d.data_reach='organization'
                 AND _module = ANY(d.modules)
                 AND dm.start_date <= current_date AND (dm.end_date IS NULL OR dm.end_date > current_date)))
$$;

CREATE OR REPLACE FUNCTION app_private.row_in_scope(_user uuid, _org uuid, _program uuid, _project uuid, _module text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_private.user_has_org_reach(_user,_org,_module)
    OR (_project IS NOT NULL AND _project = ANY(app_private.user_scope_project_ids(_user,_org)))
    OR (_project IS NULL AND _program IS NOT NULL AND _program = ANY(app_private.user_scope_program_ids(_user,_org)))
$$;

CREATE OR REPLACE FUNCTION app_private.effective_beneficiary_visibility(_user uuid, _b uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND _user = auth.uid() AND (
    app_private.user_has_org_reach(_user,_org,'beneficiaries')
    OR EXISTS (SELECT 1 FROM public.beneficiary_services bs LEFT JOIN public.projects pj ON pj.id=bs.project_id
               WHERE bs.beneficiary_id=_b AND bs.organization_id=_org
                 AND (bs.project_id = ANY(app_private.user_scope_project_ids(_user,_org))
                      OR (bs.project_id IS NULL AND bs.program_id = ANY(app_private.user_scope_program_ids(_user,_org)))))
    OR EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.id=_b AND b.organization_id=_org AND b.created_by=_user))
$$;

CREATE OR REPLACE FUNCTION app_private.effective_household_visibility(_user uuid, _h uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND _user = auth.uid() AND (
    app_private.user_has_org_reach(_user,_org,'beneficiaries')
    OR EXISTS (SELECT 1 FROM public.beneficiaries b WHERE b.household_id=_h AND b.organization_id=_org
               AND app_private.effective_beneficiary_visibility(_user,b.id,_org)))
$$;

-- legacy helpers become thin wrappers over the one definition
CREATE OR REPLACE FUNCTION public.beneficiary_visible_scoped(_user_id uuid, _b_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_private.effective_beneficiary_visibility(_user_id,_b_id,_org_id) $$;
CREATE OR REPLACE FUNCTION public.user_assigned_program_ids(_user_id uuid, _org_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT unnest(app_private.user_scope_program_ids(_user_id,_org_id)) $$;
CREATE OR REPLACE FUNCTION public.user_assigned_project_ids(_user_id uuid, _org_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT unnest(app_private.user_scope_project_ids(_user_id,_org_id)) $$;

CREATE OR REPLACE FUNCTION public.my_scope()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH o AS (SELECT public.get_user_organization_id(auth.uid()) org)
  SELECT jsonb_build_object(
    'organization_id', o.org,
    'org_reach', app_private.user_has_org_reach(auth.uid(), o.org, 'dashboard'),
    'program_ids', to_jsonb(app_private.user_scope_program_ids(auth.uid(), o.org)),
    'project_ids', to_jsonb(app_private.user_scope_project_ids(auth.uid(), o.org)))
  FROM o
$$;

REVOKE EXECUTE ON FUNCTION app_private.user_scope_program_ids(uuid,uuid), app_private.user_scope_project_ids(uuid,uuid),
  app_private.user_has_org_reach(uuid,uuid,text), app_private.row_in_scope(uuid,uuid,uuid,uuid,text),
  app_private.can_manage_staff_links(uuid,uuid), public.my_scope() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.user_scope_program_ids(uuid,uuid), app_private.user_scope_project_ids(uuid,uuid),
  app_private.user_has_org_reach(uuid,uuid,text), app_private.row_in_scope(uuid,uuid,uuid,uuid,text),
  app_private.can_manage_staff_links(uuid,uuid), public.my_scope() TO authenticated;

-- programs
DROP POLICY IF EXISTS "Users can view programs in their organization" ON public.programs;
CREATE POLICY programs_scoped_select ON public.programs FOR SELECT TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND (
    app_private.user_has_org_reach(auth.uid(), organization_id, 'programs')
    OR id = ANY(app_private.user_scope_program_ids(auth.uid(), organization_id))
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.program_id = programs.id AND p.id = ANY(app_private.user_scope_project_ids(auth.uid(), programs.organization_id)))
    OR app_private.user_is_donor_for_org(auth.uid(), organization_id)));

-- projects
DROP POLICY IF EXISTS "Users can view projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects in their organization" ON public.projects;
CREATE POLICY projects_scoped_select ON public.projects FOR SELECT TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND (
    app_private.user_has_org_reach(auth.uid(), organization_id, 'projects')
    OR id = ANY(app_private.user_scope_project_ids(auth.uid(), organization_id))
    OR app_private.user_is_donor_for_org(auth.uid(), organization_id)));
CREATE POLICY projects_scoped_insert ON public.projects FOR INSERT TO authenticated WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id) AND (
    app_private.user_has_org_reach(auth.uid(), organization_id, 'projects')
    OR program_id = ANY(app_private.user_scope_program_ids(auth.uid(), organization_id))));
CREATE POLICY projects_scoped_update ON public.projects FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND (app_private.user_has_org_reach(auth.uid(), organization_id, 'projects') OR id = ANY(app_private.user_scope_project_ids(auth.uid(), organization_id))))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND (app_private.user_has_org_reach(auth.uid(), organization_id, 'projects') OR id = ANY(app_private.user_scope_project_ids(auth.uid(), organization_id))));
CREATE POLICY projects_scoped_delete ON public.projects FOR DELETE TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.user_has_org_reach(auth.uid(), organization_id, 'projects'));

-- activities
DROP POLICY IF EXISTS activities_select_org ON public.activities;
DROP POLICY IF EXISTS activities_insert_org ON public.activities;
DROP POLICY IF EXISTS activities_update_org ON public.activities;
DROP POLICY IF EXISTS activities_delete_org ON public.activities;
CREATE POLICY activities_scoped_select ON public.activities FOR SELECT TO authenticated USING (
  (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'activities'))
  OR public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY activities_scoped_insert ON public.activities FOR INSERT TO authenticated WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'activities'));
CREATE POLICY activities_scoped_update ON public.activities FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'activities'))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'activities'));
CREATE POLICY activities_scoped_delete ON public.activities FOR DELETE TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'activities'));

-- home_visits
DROP POLICY IF EXISTS org_members_view_home_visits ON public.home_visits;
DROP POLICY IF EXISTS org_members_insert_home_visits ON public.home_visits;
DROP POLICY IF EXISTS org_members_update_home_visits ON public.home_visits;
DROP POLICY IF EXISTS org_members_delete_home_visits ON public.home_visits;
CREATE OR REPLACE FUNCTION app_private.visit_in_scope(_user uuid, _org uuid, _b uuid, _h uuid, _by uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _by = _user
    OR (_b IS NOT NULL AND app_private.effective_beneficiary_visibility(_user,_b,_org))
    OR (_h IS NOT NULL AND app_private.effective_household_visibility(_user,_h,_org))
    OR (_b IS NULL AND _h IS NULL AND app_private.user_has_org_reach(_user,_org,'beneficiaries'))
$$;
REVOKE EXECUTE ON FUNCTION app_private.visit_in_scope(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.visit_in_scope(uuid,uuid,uuid,uuid,uuid) TO authenticated;
CREATE POLICY home_visits_scoped_select ON public.home_visits FOR SELECT TO authenticated USING (
  (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.visit_in_scope(auth.uid(), organization_id, beneficiary_id, household_id, visited_by))
  OR public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY home_visits_scoped_insert ON public.home_visits FOR INSERT TO authenticated WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.visit_in_scope(auth.uid(), organization_id, beneficiary_id, household_id, NULL));
CREATE POLICY home_visits_scoped_update ON public.home_visits FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.visit_in_scope(auth.uid(), organization_id, beneficiary_id, household_id, visited_by))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.visit_in_scope(auth.uid(), organization_id, beneficiary_id, household_id, visited_by));
CREATE POLICY home_visits_scoped_delete ON public.home_visits FOR DELETE TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.visit_in_scope(auth.uid(), organization_id, beneficiary_id, household_id, visited_by));

-- school_visits
DROP POLICY IF EXISTS org_members_view_school_visits ON public.school_visits;
DROP POLICY IF EXISTS org_members_insert_school_visits ON public.school_visits;
DROP POLICY IF EXISTS org_members_update_school_visits ON public.school_visits;
DROP POLICY IF EXISTS org_members_delete_school_visits ON public.school_visits;
CREATE POLICY school_visits_scoped_select ON public.school_visits FOR SELECT TO authenticated USING (
  (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.visit_in_scope(auth.uid(), organization_id, beneficiary_id, NULL, visited_by))
  OR public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY school_visits_scoped_insert ON public.school_visits FOR INSERT TO authenticated WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.visit_in_scope(auth.uid(), organization_id, beneficiary_id, NULL, NULL));
CREATE POLICY school_visits_scoped_update ON public.school_visits FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.visit_in_scope(auth.uid(), organization_id, beneficiary_id, NULL, visited_by))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.visit_in_scope(auth.uid(), organization_id, beneficiary_id, NULL, visited_by));
CREATE POLICY school_visits_scoped_delete ON public.school_visits FOR DELETE TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.visit_in_scope(auth.uid(), organization_id, beneficiary_id, NULL, visited_by));

-- field_logs
DROP POLICY IF EXISTS field_logs_select ON public.field_logs;
DROP POLICY IF EXISTS field_logs_insert ON public.field_logs;
CREATE POLICY field_logs_scoped_select ON public.field_logs FOR SELECT TO authenticated USING (
  (public.user_belongs_to_org(auth.uid(), organization_id) AND (
     logged_by = auth.uid()
     OR app_private.user_has_org_reach(auth.uid(), organization_id, 'field_logs')
     OR (project_id IS NOT NULL AND project_id = ANY(app_private.user_scope_project_ids(auth.uid(), organization_id)))
     OR (beneficiary_id IS NOT NULL AND app_private.effective_beneficiary_visibility(auth.uid(), beneficiary_id, organization_id))))
  OR public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY field_logs_scoped_insert ON public.field_logs FOR INSERT TO authenticated WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id) AND logged_by = auth.uid()
  AND (project_id IS NULL OR app_private.row_in_scope(auth.uid(), organization_id, NULL, project_id, 'field_logs'))
  AND (beneficiary_id IS NULL OR app_private.effective_beneficiary_visibility(auth.uid(), beneficiary_id, organization_id)));

-- me_form_submissions
DROP POLICY IF EXISTS me_form_submissions_select ON public.me_form_submissions;
DROP POLICY IF EXISTS me_form_submissions_insert ON public.me_form_submissions;
DROP POLICY IF EXISTS me_form_submissions_update ON public.me_form_submissions;
CREATE POLICY me_form_submissions_scoped_select ON public.me_form_submissions FOR SELECT TO authenticated USING (
  (public.user_belongs_to_org(auth.uid(), organization_id) AND (submitted_by = auth.uid()
     OR app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'indicators')))
  OR public.has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY me_form_submissions_scoped_insert ON public.me_form_submissions FOR INSERT TO authenticated WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND ((program_id IS NULL AND project_id IS NULL) OR app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'indicators')));
CREATE POLICY me_form_submissions_scoped_update ON public.me_form_submissions FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND (submitted_by = auth.uid() OR app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'indicators')))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND (submitted_by = auth.uid() OR app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'indicators')));

-- program_indicators
DROP POLICY IF EXISTS "Users can view indicators in their organization" ON public.program_indicators;
DROP POLICY IF EXISTS "Users can create indicators in their organization" ON public.program_indicators;
DROP POLICY IF EXISTS "Users can update indicators in their organization" ON public.program_indicators;
DROP POLICY IF EXISTS "Users can delete indicators in their organization" ON public.program_indicators;
CREATE POLICY program_indicators_scoped_select ON public.program_indicators FOR SELECT TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'indicators'));
CREATE POLICY program_indicators_scoped_insert ON public.program_indicators FOR INSERT TO authenticated WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'indicators'));
CREATE POLICY program_indicators_scoped_update ON public.program_indicators FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'indicators'))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'indicators'));
CREATE POLICY program_indicators_scoped_delete ON public.program_indicators FOR DELETE TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.row_in_scope(auth.uid(), organization_id, program_id, project_id, 'indicators'));

-- indicator_values (via indicators.program_ids)
DROP POLICY IF EXISTS "Users can view indicator values in their org" ON public.indicator_values;
DROP POLICY IF EXISTS results_value_scope ON public.indicator_values;
CREATE POLICY indicator_values_scoped_select ON public.indicator_values FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.indicators i WHERE i.id = indicator_values.indicator_id
    AND public.user_belongs_to_org(auth.uid(), i.organization_id)
    AND NOT app_private.user_is_donor_for_org(auth.uid(), i.organization_id)
    AND (app_private.user_has_org_reach(auth.uid(), i.organization_id, 'indicators')
         OR i.program_ids && app_private.user_scope_program_ids(auth.uid(), i.organization_id))));

-- beneficiary_uploads
DROP POLICY IF EXISTS "Users can view beneficiary_uploads in their organization" ON public.beneficiary_uploads;
DROP POLICY IF EXISTS "Users can create beneficiary_uploads in their organization" ON public.beneficiary_uploads;
DROP POLICY IF EXISTS "Users can delete beneficiary_uploads in their organization" ON public.beneficiary_uploads;
CREATE POLICY beneficiary_uploads_scoped_select ON public.beneficiary_uploads FOR SELECT TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND (uploaded_by = auth.uid() OR app_private.effective_beneficiary_visibility(auth.uid(), beneficiary_id, organization_id)));
CREATE POLICY beneficiary_uploads_scoped_insert ON public.beneficiary_uploads FOR INSERT TO authenticated WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.effective_beneficiary_visibility(auth.uid(), beneficiary_id, organization_id));
CREATE POLICY beneficiary_uploads_scoped_delete ON public.beneficiary_uploads FOR DELETE TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND (uploaded_by = auth.uid() OR app_private.effective_beneficiary_visibility(auth.uid(), beneficiary_id, organization_id)));

-- grants: org reach for 'grants' only
DROP POLICY IF EXISTS "Users can view grants in their org" ON public.grants;
DROP POLICY IF EXISTS "Users can insert grants in their org" ON public.grants;
DROP POLICY IF EXISTS "Users can update grants in their org" ON public.grants;
DROP POLICY IF EXISTS "Users can delete grants in their org" ON public.grants;
CREATE POLICY grants_reach_select ON public.grants FOR SELECT TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.user_has_org_reach(auth.uid(), organization_id, 'grants'));
CREATE POLICY grants_reach_insert ON public.grants FOR INSERT TO authenticated WITH CHECK (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.user_has_org_reach(auth.uid(), organization_id, 'grants'));
CREATE POLICY grants_reach_update ON public.grants FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.user_has_org_reach(auth.uid(), organization_id, 'grants'))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.user_has_org_reach(auth.uid(), organization_id, 'grants'));
CREATE POLICY grants_reach_delete ON public.grants FOR DELETE TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), organization_id) AND app_private.user_has_org_reach(auth.uid(), organization_id, 'grants'));

-- team writes: admins / staff managers, or the lead of that programme/project
CREATE OR REPLACE FUNCTION app_private.leads_program(_user uuid, _org uuid, _program uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user = auth.uid() AND EXISTS (SELECT 1 FROM public.programme_team pt WHERE pt.org_id=_org AND pt.staff_id=_user
    AND pt.program_id=_program AND pt.project_id IS NULL AND pt.is_lead AND (pt.end_date IS NULL OR pt.end_date > current_date)) $$;
CREATE OR REPLACE FUNCTION app_private.leads_project(_user uuid, _project uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.project_team_members m WHERE m.project_id=_project AND m.user_id=_user AND m.is_lead
            AND (m.end_date IS NULL OR m.end_date > current_date))
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id=_project AND app_private.leads_program(_user,p.organization_id,p.program_id))) $$;
REVOKE EXECUTE ON FUNCTION app_private.leads_program(uuid,uuid,uuid), app_private.leads_project(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.leads_program(uuid,uuid,uuid), app_private.leads_project(uuid,uuid) TO authenticated;

DROP POLICY IF EXISTS pteam_insert ON public.programme_team;
DROP POLICY IF EXISTS pteam_update ON public.programme_team;
DROP POLICY IF EXISTS pteam_delete ON public.programme_team;
CREATE POLICY pteam_insert ON public.programme_team FOR INSERT TO authenticated WITH CHECK (
  public.user_belongs_to_org(auth.uid(), org_id) AND (app_private.can_manage_staff_links(auth.uid(), org_id)
    OR (NOT is_lead AND app_private.leads_program(auth.uid(), org_id, program_id))));
CREATE POLICY pteam_update ON public.programme_team FOR UPDATE TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), org_id) AND (app_private.can_manage_staff_links(auth.uid(), org_id) OR app_private.leads_program(auth.uid(), org_id, program_id)))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), org_id) AND (app_private.can_manage_staff_links(auth.uid(), org_id)
    OR (NOT is_lead AND app_private.leads_program(auth.uid(), org_id, program_id))));
CREATE POLICY pteam_delete ON public.programme_team FOR DELETE TO authenticated USING (
  public.user_belongs_to_org(auth.uid(), org_id) AND app_private.can_manage_staff_links(auth.uid(), org_id));

DROP POLICY IF EXISTS "Org members manage project_team_members" ON public.project_team_members;
CREATE POLICY ptm_select ON public.project_team_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND public.user_belongs_to_org(auth.uid(), p.organization_id)));
CREATE POLICY ptm_insert ON public.project_team_members FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND public.user_belongs_to_org(auth.uid(), p.organization_id)
    AND (app_private.can_manage_staff_links(auth.uid(), p.organization_id) OR (NOT project_team_members.is_lead AND app_private.leads_project(auth.uid(), p.id)))));
CREATE POLICY ptm_update ON public.project_team_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND public.user_belongs_to_org(auth.uid(), p.organization_id)
    AND (app_private.can_manage_staff_links(auth.uid(), p.organization_id) OR app_private.leads_project(auth.uid(), p.id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND public.user_belongs_to_org(auth.uid(), p.organization_id)
    AND (app_private.can_manage_staff_links(auth.uid(), p.organization_id) OR (NOT project_team_members.is_lead AND app_private.leads_project(auth.uid(), p.id)))));
CREATE POLICY ptm_delete ON public.project_team_members FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_team_members.project_id AND app_private.can_manage_staff_links(auth.uid(), p.organization_id)));

NOTIFY pgrst, 'reload schema';
