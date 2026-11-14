INSERT INTO public.rbac_permissions(module,module_display_name,action,resource,display_name,description,sort_order) VALUES('beneficiaries','Beneficiaries','view','vulnerability_map','View vulnerability map','Suppressed area-only vulnerability and visit coverage within assigned scope',95) ON CONFLICT(module,action,resource) DO NOTHING;
INSERT INTO public.rbac_role_permissions(role_id,permission_id) SELECT r.id,p.id FROM public.rbac_roles r CROSS JOIN public.rbac_permissions p WHERE lower(r.name) IN ('org_admin','program_manager','project_manager') AND r.is_system_role AND p.module='beneficiaries' AND p.action='view' AND p.resource='vulnerability_map' ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION app_private.can_view_vulnerability_map(_org_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL
 AND (public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=_org_id AND user_id=auth.uid()))
 AND NOT EXISTS(SELECT 1 FROM public.donor_accounts WHERE user_id=auth.uid() AND organization_id=_org_id)
 AND NOT public.user_is_field_scoped(auth.uid(),_org_id)
 AND (public.user_is_org_elevated(auth.uid(),_org_id) OR public.user_has_permission(auth.uid(),_org_id,'beneficiaries','view','vulnerability_map') OR EXISTS(SELECT 1 FROM public.programme_team WHERE org_id=_org_id AND staff_id=auth.uid() AND is_lead AND start_date<=CURRENT_DATE AND (end_date IS NULL OR end_date>=CURRENT_DATE)));
$$;
REVOKE ALL ON FUNCTION app_private.can_view_vulnerability_map(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION app_private.can_view_vulnerability_map(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.can_view_vulnerability_map(_org_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$ SELECT app_private.can_view_vulnerability_map(_org_id); $$;
REVOKE ALL ON FUNCTION public.can_view_vulnerability_map(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.can_view_vulnerability_map(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION app_private.get_vulnerability_map(_org_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; gap integer:=45; elevated boolean;
BEGIN
 IF NOT app_private.can_view_vulnerability_map(_org_id) THEN RAISE EXCEPTION 'Your role cannot view vulnerability maps' USING ERRCODE='42501'; END IF;
 elevated:=public.user_is_org_elevated(auth.uid(),_org_id);
 SELECT CASE WHEN value->>'visit_gap_days' ~ '^[0-9]{1,4}$' THEN greatest(1,least(3650,(value->>'visit_gap_days')::integer)) ELSE 45 END INTO gap FROM public.org_settings WHERE organization_id=_org_id AND key='vulnerability_map'; gap:=coalesce(gap,45);
 WITH scoped AS (
  SELECT b.id,b.household_id,b.legacy_child_id,lower(trim(coalesce(b.country,'Kenya'))) country,lower(trim(coalesce(b.county,''))) county,
   CASE WHEN nullif(trim(b.sub_county),'') IS NOT NULL THEN 'sub_county' ELSE 'village' END area_kind,
   lower(trim(coalesce(nullif(trim(b.sub_county),''),nullif(trim(b.estate_village),''),'Unknown area'))) area,
   a.severity
  FROM public.beneficiaries b
  LEFT JOIN LATERAL(SELECT CASE WHEN lower(v.sensitivity)='standard' AND lower(v.review_decision)<>'pending' AND v.reviewer_id IS NOT NULL THEN lower(v.severity) ELSE NULL END severity FROM public.vulnerability_assessments v WHERE v.organization_id=_org_id AND v.beneficiary_id=b.id AND v.deleted_at IS NULL ORDER BY v.created_at DESC,v.version DESC LIMIT 1) a ON true
  WHERE b.organization_id=_org_id AND b.deleted_at IS NULL AND lower(b.status)='active' AND coalesce(b.is_active,true)
  AND (elevated OR EXISTS(SELECT 1 FROM public.beneficiary_services bs WHERE bs.organization_id=_org_id AND bs.beneficiary_id=b.id AND (bs.program_id IN(SELECT public.user_assigned_program_ids(auth.uid(),_org_id)) OR bs.project_id IN(SELECT public.user_assigned_project_ids(auth.uid(),_org_id)))))
 ), visits AS (
  SELECT s.id,max(v.visit_date) last_visit FROM scoped s LEFT JOIN LATERAL(
   SELECT h.visit_date::date FROM public.home_visits h WHERE h.organization_id=_org_id AND h.deleted_at IS NULL AND (h.beneficiary_id=s.id OR (s.household_id IS NOT NULL AND h.household_id=s.household_id))
   UNION ALL SELECT x.visit_date::date FROM public.school_visits x WHERE x.organization_id=_org_id AND x.deleted_at IS NULL AND x.beneficiary_id=s.id
   UNION ALL SELECT x.visit_date FROM public.beneficiary_visitations x WHERE x.organization_id=_org_id AND x.beneficiary_id=s.id
   UNION ALL SELECT x.visit_date FROM public.program_visits x WHERE x.organization_id=_org_id AND (x.beneficiary_id=s.id OR (s.legacy_child_id IS NOT NULL AND x.linked_child_id=s.legacy_child_id))
  ) v ON v.visit_date<=CURRENT_DATE GROUP BY s.id
 ), grouped AS (
  SELECT s.country,s.county,s.area_kind,s.area,count(DISTINCT s.id)::integer total,
   count(DISTINCT s.id) FILTER(WHERE s.severity IN ('critical','high'))::integer high,
   count(DISTINCT s.id) FILTER(WHERE s.severity IS NOT NULL)::integer assessed,max(v.last_visit) last_visit
  FROM scoped s LEFT JOIN visits v ON v.id=s.id GROUP BY s.country,s.county,s.area_kind,s.area
 ), safe AS (
  SELECT *, total<5 OR (high>0 AND (high<5 OR (total>high AND total-high<5))) OR (assessed>0 AND (assessed<5 OR (total>assessed AND total-assessed<5))) suppressed FROM grouped
 ) SELECT jsonb_build_object('visit_gap_days',gap,'minimum_cell_size',5,'areas',coalesce(jsonb_agg(
  CASE WHEN suppressed THEN jsonb_build_object('country',country,'county',county,'area_kind',area_kind,'area',area,'suppressed',true)
  ELSE jsonb_build_object('country',country,'county',county,'area_kind',area_kind,'area',area,'suppressed',false,'beneficiaries',total,'assessed',assessed,'high_need',high,'high_share',CASE WHEN assessed>0 THEN high::numeric/total ELSE NULL END,'days_since_visit',CURRENT_DATE-last_visit) END ORDER BY country,county,area),'[]'::jsonb)) INTO result FROM safe;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION app_private.get_vulnerability_map(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION app_private.get_vulnerability_map(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_vulnerability_map(_org_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$ SELECT app_private.get_vulnerability_map(_org_id); $$;
REVOKE ALL ON FUNCTION public.get_vulnerability_map(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.get_vulnerability_map(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION app_private.set_vulnerability_map_gap(_org_id uuid,_days integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE written uuid; BEGIN
 IF NOT app_private.can_view_vulnerability_map(_org_id) OR NOT (public.user_is_org_elevated(auth.uid(),_org_id) OR public.user_has_permission(auth.uid(),_org_id,'settings','manage','org_settings')) THEN RAISE EXCEPTION 'Your role cannot change map settings' USING ERRCODE='42501'; END IF;
 IF _days<1 OR _days>3650 OR _days IS NULL THEN RAISE EXCEPTION 'Choose a visit gap between 1 and 3650 days'; END IF;
 INSERT INTO public.org_settings(organization_id,key,value) VALUES(_org_id,'vulnerability_map',jsonb_build_object('visit_gap_days',_days)) ON CONFLICT(organization_id,key) DO UPDATE SET value=public.org_settings.value || excluded.value,updated_at=now() RETURNING id INTO written;
 INSERT INTO public.audit_logs(organization_id,user_id,action,entity_type,entity_id,new_values) VALUES(_org_id,auth.uid(),'update','org_settings',written,jsonb_build_object('visit_gap_days',_days)); RETURN written;
END; $$;
REVOKE ALL ON FUNCTION app_private.set_vulnerability_map_gap(uuid,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION app_private.set_vulnerability_map_gap(uuid,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.set_vulnerability_map_gap(_org_id uuid,_days integer) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$ SELECT app_private.set_vulnerability_map_gap(_org_id,_days); $$;
REVOKE ALL ON FUNCTION public.set_vulnerability_map_gap(uuid,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.set_vulnerability_map_gap(uuid,integer) TO authenticated;
NOTIFY pgrst,'reload schema';