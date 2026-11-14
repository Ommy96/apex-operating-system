ALTER TABLE public.project_team_members ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER project_team_updated_at BEFORE UPDATE ON public.project_team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.user_assigned_program_ids(_user_id uuid, _org_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT pt.program_id FROM public.programme_team pt
 WHERE pt.org_id = _org_id AND pt.staff_id = _user_id
 AND (pt.end_date IS NULL OR pt.end_date > CURRENT_DATE)
 AND (pt.project_id IS NULL OR NOT public.user_is_field_scoped(_user_id, _org_id))
 UNION
 SELECT pr.program_id FROM public.projects pr
 JOIN public.project_team_members ptm ON ptm.project_id = pr.id
 WHERE pr.organization_id = _org_id AND ptm.user_id = _user_id
 AND (ptm.end_date IS NULL OR ptm.end_date > CURRENT_DATE)
 AND NOT public.user_is_field_scoped(_user_id, _org_id);
$$;
CREATE OR REPLACE FUNCTION public.user_assigned_project_ids(_user_id uuid, _org_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT ptm.project_id FROM public.project_team_members ptm
 JOIN public.projects pr ON pr.id = ptm.project_id
 WHERE pr.organization_id = _org_id AND ptm.user_id = _user_id
 AND (ptm.end_date IS NULL OR ptm.end_date > CURRENT_DATE)
 UNION
 SELECT pt.project_id FROM public.programme_team pt
 WHERE pt.org_id = _org_id AND pt.staff_id = _user_id
 AND (pt.end_date IS NULL OR pt.end_date > CURRENT_DATE) AND pt.project_id IS NOT NULL;
$$;
NOTIFY pgrst, 'reload schema';