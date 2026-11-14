DO $patch$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('app_private.get_vulnerability_map(uuid)'::regprocedure) INTO definition;
 definition:=replace(definition,'bs.program_id IN(SELECT public.user_assigned_program_ids(auth.uid(),_org_id)) OR bs.project_id IN(SELECT public.user_assigned_project_ids(auth.uid(),_org_id))','bs.program_id IN(SELECT pt.program_id FROM public.programme_team pt WHERE pt.org_id=_org_id AND pt.staff_id=auth.uid() AND pt.project_id IS NULL AND pt.start_date<=CURRENT_DATE AND (pt.end_date IS NULL OR pt.end_date>=CURRENT_DATE)) OR bs.project_id IN(SELECT public.user_assigned_project_ids(auth.uid(),_org_id))');
 definition:=replace(definition,'  ) v ON v.visit_date<=CURRENT_DATE',E'   UNION ALL SELECT x.completed_at::date FROM public.visit_requests x WHERE x.organization_id=_org_id AND x.deleted_at IS NULL AND x.beneficiary_id=s.id AND x.completed_at IS NOT NULL\n  ) v ON v.visit_date<=CURRENT_DATE');
 EXECUTE definition;
END; $patch$;
CREATE OR REPLACE FUNCTION app_private.set_vulnerability_map_gap(_org_id uuid,_days integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE written uuid; BEGIN
 IF NOT app_private.can_view_vulnerability_map(_org_id) OR NOT (public.user_is_org_elevated(auth.uid(),_org_id) OR public.user_has_permission(auth.uid(),_org_id,'settings','manage','org_settings')) THEN RAISE EXCEPTION 'Your role cannot change map settings' USING ERRCODE='42501'; END IF;
 IF _days<1 OR _days>3650 OR _days IS NULL THEN RAISE EXCEPTION 'Choose a visit gap between 1 and 3650 days'; END IF;
 INSERT INTO public.org_settings(organization_id,key,value) VALUES(_org_id,'vulnerability_map',jsonb_build_object('visit_gap_days',_days)) ON CONFLICT(organization_id,key) DO UPDATE SET value=public.org_settings.value || excluded.value,updated_at=now() RETURNING id INTO written;
 INSERT INTO public.audit_logs(user_id,event_type,entity_type,entity_id,new_values,metadata) VALUES(auth.uid(),'vulnerability_map_settings_updated','org_settings',written,jsonb_build_object('visit_gap_days',_days),jsonb_build_object('organization_id',_org_id)); RETURN written;
END; $$;
DROP FUNCTION public.set_vulnerability_map_gap(uuid,integer);
CREATE FUNCTION public.set_vulnerability_map_gap(_org_id uuid,_days integer) RETURNS TABLE(id uuid) LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$ SELECT app_private.set_vulnerability_map_gap(_org_id,_days); $$;
REVOKE ALL ON FUNCTION public.set_vulnerability_map_gap(uuid,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.set_vulnerability_map_gap(uuid,integer) TO authenticated;
NOTIFY pgrst,'reload schema';