CREATE OR REPLACE FUNCTION app_private.results_indicator_access(_indicator uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.indicators i WHERE i.id=_indicator AND (public.has_role(auth.uid(),'admin') OR (public.user_belongs_to_org(auth.uid(),i.organization_id) AND NOT app_private.user_is_donor_for_org(auth.uid(),i.organization_id) AND (NOT (public.user_is_program_scoped(auth.uid(),i.organization_id) OR public.user_is_field_scoped(auth.uid(),i.organization_id)) OR EXISTS(SELECT 1 FROM public.programme_team t WHERE t.org_id=i.organization_id AND t.staff_id=auth.uid() AND t.program_id=ANY(i.program_ids) AND (t.start_date IS NULL OR t.start_date<=current_date) AND (t.end_date IS NULL OR t.end_date>=current_date))))))
$$;
REVOKE ALL ON FUNCTION app_private.results_indicator_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION app_private.results_indicator_access(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.results_indicator_access(_indicator uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$ SELECT app_private.results_indicator_access(_indicator) $$;
DO $$ DECLARE def text; BEGIN SELECT pg_get_functiondef('public.compute_results_indicator(uuid,date,date)'::regprocedure) INTO def;
 def:=replace(def,'b.organization_id=i.organization_id AND b.deleted_at IS NULL','b.organization_id=i.organization_id AND b.deleted_at IS NULL AND public.beneficiary_visible_scoped(auth.uid(),b.id,i.organization_id)');
 def:=replace(def,'b.organization_id=s.organization_id AND b.deleted_at IS NULL','b.organization_id=s.organization_id AND b.deleted_at IS NULL AND public.beneficiary_visible_scoped(auth.uid(),b.id,i.organization_id)');
 def:=replace(def,'b.organization_id=p.organization_id AND b.deleted_at IS NULL','b.organization_id=p.organization_id AND b.deleted_at IS NULL AND public.beneficiary_visible_scoped(auth.uid(),b.id,i.organization_id)');
 EXECUTE def;
END $$;
NOTIFY pgrst,'reload schema';