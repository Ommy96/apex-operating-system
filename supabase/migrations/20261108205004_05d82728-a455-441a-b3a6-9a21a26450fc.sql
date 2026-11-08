CREATE TABLE public.data_quality_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id), template_key text NOT NULL, config jsonb NOT NULL DEFAULT '{}'::jsonb, enabled boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, updated_by uuid, UNIQUE(organization_id,template_key)
);
GRANT SELECT,INSERT,UPDATE ON public.data_quality_rules TO authenticated;
GRANT ALL ON public.data_quality_rules TO service_role;
ALTER TABLE public.data_quality_rules ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION app_private.quality_staff_access(_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND NOT app_private.user_is_donor_for_org(auth.uid(),_org) AND (public.has_role(auth.uid(),'admin') OR (public.user_belongs_to_org(auth.uid(),_org) AND (public.user_has_permission(auth.uid(),_org,'me','view','me') OR public.user_has_permission(auth.uid(),_org,'beneficiaries','view','beneficiaries'))))
$$;
CREATE OR REPLACE FUNCTION app_private.quality_manage_access(_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT app_private.quality_staff_access(_org) AND (public.has_role(auth.uid(),'admin') OR public.user_has_permission(auth.uid(),_org,'me','manage','validation_rules'))
$$;
CREATE OR REPLACE FUNCTION app_private.quality_beneficiary_access(_org uuid,_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT app_private.quality_staff_access(_org) AND EXISTS(SELECT 1 FROM public.beneficiaries b WHERE b.id=_id AND b.organization_id=_org AND b.deleted_at IS NULL AND (public.has_role(auth.uid(),'admin') OR NOT (public.user_is_program_scoped(auth.uid(),_org) OR public.user_is_field_scoped(auth.uid(),_org)) OR public.beneficiary_visible_scoped(auth.uid(),b.id,_org)))
$$;
CREATE OR REPLACE FUNCTION app_private.quality_entity_access(_org uuid,_type text,_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE b uuid; BEGIN
 IF NOT app_private.quality_staff_access(_org) THEN RETURN false; END IF;
 IF _type='beneficiary' THEN RETURN app_private.quality_beneficiary_access(_org,_id);
 ELSIF _type='beneficiary_need' THEN SELECT beneficiary_id INTO b FROM public.beneficiary_needs WHERE id=_id AND organization_id=_org;
 ELSIF _type='consent_record' THEN SELECT beneficiary_id INTO b FROM public.consent_records WHERE id=_id AND organization_id=_org;
 ELSIF _type='consent_document' THEN SELECT beneficiary_id INTO b FROM public.consent_documents WHERE id=_id AND organization_id=_org;
 ELSIF _type='indicator_value' THEN RETURN EXISTS(SELECT 1 FROM public.indicator_values v WHERE v.id=_id AND v.organization_id=_org AND app_private.results_indicator_access(v.indicator_id));
 ELSE RETURN false; END IF;
 RETURN b IS NOT NULL AND app_private.quality_beneficiary_access(_org,b);
END $$;
CREATE POLICY quality_rules_read ON public.data_quality_rules FOR SELECT TO authenticated USING(app_private.quality_staff_access(organization_id));
CREATE POLICY quality_rules_create ON public.data_quality_rules FOR INSERT TO authenticated WITH CHECK(app_private.quality_manage_access(organization_id));
CREATE POLICY quality_rules_update ON public.data_quality_rules FOR UPDATE TO authenticated USING(app_private.quality_manage_access(organization_id)) WITH CHECK(app_private.quality_manage_access(organization_id));
CREATE POLICY quality_rules_no_delete ON public.data_quality_rules FOR DELETE TO authenticated USING(false);
CREATE OR REPLACE FUNCTION public.validate_quality_rule() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.template_key NOT IN ('missing_dob','minor_without_guardian','expired_consent','care_unset','need_without_assessment') THEN RAISE EXCEPTION 'Unknown approved quality template'; END IF;
 IF jsonb_typeof(NEW.config)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(NEW.config) k WHERE k<>'project_id') THEN RAISE EXCEPTION 'Only a project_id configuration is allowed'; END IF;
 IF NEW.config ? 'project_id' THEN
 IF jsonb_typeof(NEW.config->'project_id')<>'string' OR NOT EXISTS(SELECT 1 FROM public.projects p WHERE p.id=(NEW.config->>'project_id')::uuid AND p.organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'Invalid project scope'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND (NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.template_key IS DISTINCT FROM OLD.template_key) THEN RAISE EXCEPTION 'Rule identity cannot change'; END IF;
 NEW.updated_at:=now(); NEW.updated_by:=auth.uid(); RETURN NEW;
END $$;
CREATE TRIGGER validate_quality_rule BEFORE INSERT OR UPDATE ON public.data_quality_rules FOR EACH ROW EXECUTE FUNCTION public.validate_quality_rule();
ALTER TABLE public.data_quality_flags ADD COLUMN rule_id uuid REFERENCES public.data_quality_rules(id), ADD COLUMN beneficiary_id uuid, ADD COLUMN last_seen_at timestamptz, ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN deleted_at timestamptz, ADD COLUMN updated_by uuid;
CREATE UNIQUE INDEX quality_rule_record_identity ON public.data_quality_flags(rule_id,entity_id) WHERE rule_id IS NOT NULL;
CREATE OR REPLACE FUNCTION app_private.quality_rule_failed(_rule uuid,_record uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.data_quality_rules; b public.beneficiaries; bid uuid; expired boolean; BEGIN
 SELECT * INTO r FROM public.data_quality_rules WHERE id=_rule;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Unknown rule'; END IF;
 IF r.template_key='expired_consent' THEN
 SELECT c.beneficiary_id,(c.consent_given AND c.withdrawal_date IS NULL AND c.expiry_date<now()) INTO bid,expired FROM public.consent_records c WHERE c.id=_record AND c.organization_id=r.organization_id;
 ELSIF r.template_key='need_without_assessment' THEN SELECT n.beneficiary_id INTO bid FROM public.beneficiary_needs n WHERE n.id=_record AND n.organization_id=r.organization_id;
 ELSE bid:=_record; END IF;
 SELECT * INTO b FROM public.beneficiaries WHERE id=bid AND organization_id=r.organization_id AND deleted_at IS NULL;
 IF b.id IS NULL OR NOT app_private.quality_beneficiary_access(r.organization_id,b.id) THEN RAISE EXCEPTION 'Record not accessible'; END IF;
 CASE r.template_key
 WHEN 'missing_dob' THEN RETURN b.date_of_birth IS NULL;
 WHEN 'minor_without_guardian' THEN RETURN b.date_of_birth IS NOT NULL AND b.date_of_birth<=current_date AND b.date_of_birth>current_date-interval '18 years' AND NOT EXISTS(SELECT 1 FROM public.beneficiary_guardians g WHERE g.beneficiary_id=b.id AND g.deleted_at IS NULL);
 WHEN 'care_unset' THEN RETURN b.care_arrangement IS NULL OR lower(trim(b.care_arrangement::text))='unknown';
 WHEN 'expired_consent' THEN RETURN coalesce(expired,false);
 WHEN 'need_without_assessment' THEN RETURN NOT EXISTS(SELECT 1 FROM public.vulnerability_assessments a WHERE a.organization_id=r.organization_id AND a.beneficiary_id=b.id AND a.deleted_at IS NULL AND _record=ANY(a.beneficiary_need_ids));
 ELSE RAISE EXCEPTION 'Unknown approved quality template'; END CASE;
END $$;
CREATE OR REPLACE FUNCTION public.validate_data_quality_flag() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.entity_type NOT IN ('beneficiary','activity','indicator_value','form_submission','case_entry','visit','beneficiary_need','consent_record','consent_document') OR NEW.flag_severity NOT IN ('info','warning','error') THEN RAISE EXCEPTION 'Invalid quality flag'; END IF;
 IF TG_OP='UPDATE' AND (NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.entity_id IS DISTINCT FROM OLD.entity_id OR NEW.rule_id IS DISTINCT FROM OLD.rule_id OR NEW.entity_type IS DISTINCT FROM OLD.entity_type) THEN RAISE EXCEPTION 'Issue identity cannot change'; END IF;
 IF NEW.rule_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.data_quality_rules r WHERE r.id=NEW.rule_id AND r.organization_id=NEW.organization_id AND r.template_key=NEW.flag_type) THEN RAISE EXCEPTION 'Issue must reference an approved rule'; END IF;
 IF NEW.is_resolved AND (TG_OP='INSERT' OR NOT OLD.is_resolved) THEN
 IF NEW.rule_id IS NULL THEN RAISE EXCEPTION 'Legacy flag requires a supported rule before verified closure'; END IF;
 IF nullif(trim(NEW.resolution_note),'') IS NULL THEN RAISE EXCEPTION 'Correction note required'; END IF;
 IF app_private.quality_rule_failed(NEW.rule_id,NEW.entity_id) THEN RAISE EXCEPTION 'Issue remains: correct the underlying record before closure'; END IF;
 NEW.resolved_by:=auth.uid(); NEW.resolved_at:=now();
 END IF;
 NEW.updated_at:=now(); NEW.updated_by:=auth.uid(); RETURN NEW;
END $$;
DROP POLICY IF EXISTS dq_flags_select ON public.data_quality_flags;
DROP POLICY IF EXISTS dq_flags_insert ON public.data_quality_flags;
DROP POLICY IF EXISTS dq_flags_update ON public.data_quality_flags;
CREATE POLICY quality_flags_read ON public.data_quality_flags FOR SELECT TO authenticated USING(deleted_at IS NULL AND app_private.quality_entity_access(organization_id,entity_type,entity_id));
CREATE POLICY quality_flags_create ON public.data_quality_flags FOR INSERT TO authenticated WITH CHECK(app_private.quality_entity_access(organization_id,entity_type,entity_id));
CREATE POLICY quality_flags_update ON public.data_quality_flags FOR UPDATE TO authenticated USING(app_private.quality_entity_access(organization_id,entity_type,entity_id)) WITH CHECK(app_private.quality_entity_access(organization_id,entity_type,entity_id));
CREATE POLICY quality_flags_no_delete ON public.data_quality_flags FOR DELETE TO authenticated USING(false);
INSERT INTO public.data_quality_rules(organization_id,template_key) SELECT o.id,k FROM public.organizations o CROSS JOIN unnest(ARRAY['missing_dob','minor_without_guardian','expired_consent','care_unset','need_without_assessment']) k ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.scan_data_quality(_org uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.data_quality_rules; item record; found_count int:=0; new_count int:=0; n int; BEGIN
 IF NOT app_private.quality_staff_access(_org) OR NOT (public.has_role(auth.uid(),'admin') OR public.user_has_permission(auth.uid(),_org,'me','manage','validation_rules') OR public.user_has_permission(auth.uid(),_org,'beneficiaries','edit','beneficiaries')) THEN RAISE EXCEPTION 'Not authorised to scan'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_org::text,0));
 INSERT INTO public.data_quality_rules(organization_id,template_key) SELECT _org,k FROM unnest(ARRAY['missing_dob','minor_without_guardian','expired_consent','care_unset','need_without_assessment']) k ON CONFLICT DO NOTHING;
 FOR r IN SELECT * FROM public.data_quality_rules WHERE organization_id=_org AND enabled AND deleted_at IS NULL LOOP
 FOR item IN
 SELECT b.id record_id,b.id bid,'beneficiary'::text kind FROM public.beneficiaries b WHERE r.template_key IN ('missing_dob','minor_without_guardian','care_unset') AND b.organization_id=_org AND b.deleted_at IS NULL AND b.beneficiary_type::text<>'group'
 UNION ALL SELECT c.id,c.beneficiary_id,'consent_record' FROM public.consent_records c WHERE r.template_key='expired_consent' AND c.organization_id=_org AND c.beneficiary_id IS NOT NULL
 UNION ALL SELECT nn.id,nn.beneficiary_id,'beneficiary_need' FROM public.beneficiary_needs nn WHERE r.template_key='need_without_assessment' AND nn.organization_id=_org
 LOOP
 IF NOT app_private.quality_beneficiary_access(_org,item.bid) THEN CONTINUE; END IF;
 IF r.config ? 'project_id' AND NOT EXISTS(SELECT 1 FROM public.beneficiary_services bs WHERE bs.beneficiary_id=item.bid AND bs.organization_id=_org AND bs.project_id=(r.config->>'project_id')::uuid) THEN CONTINUE; END IF;
 IF app_private.quality_rule_failed(r.id,item.record_id) THEN
 INSERT INTO public.data_quality_flags(organization_id,rule_id,entity_type,entity_id,beneficiary_id,flag_type,flag_severity,flag_message,flagged_by,last_seen_at)
 VALUES(_org,r.id,item.kind,item.record_id,item.bid,r.template_key,'warning',CASE r.template_key WHEN 'missing_dob' THEN 'Date of birth missing' WHEN 'minor_without_guardian' THEN 'Minor has no linked guardian' WHEN 'expired_consent' THEN 'Recorded consent has expired' WHEN 'care_unset' THEN 'Care arrangement is not set' ELSE 'Need has no linked assessment' END,auth.uid()::text,now()) ON CONFLICT(rule_id,entity_id) WHERE rule_id IS NOT NULL DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT; new_count:=new_count+n; found_count:=found_count+1;
 UPDATE public.data_quality_flags SET is_resolved=false,resolved_at=NULL,resolved_by=NULL,resolution_note=NULL,last_seen_at=now(),deleted_at=NULL WHERE rule_id=r.id AND entity_id=item.record_id;
 END IF;
 END LOOP; END LOOP;
 INSERT INTO public.audit_logs(event_type,entity_type,entity_id,user_id,metadata) VALUES('data_quality_scan','organization',_org,auth.uid(),jsonb_build_object('organization_id',_org,'new_issues',new_count,'failing_records',found_count));
 RETURN jsonb_build_object('new_issues',new_count,'failing_records',found_count);
END $$;
CREATE OR REPLACE FUNCTION public.recheck_data_quality_issue(_issue uuid,_note text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.data_quality_flags; BEGIN
 SELECT * INTO f FROM public.data_quality_flags WHERE id=_issue FOR UPDATE;
 IF f.id IS NULL OR NOT app_private.quality_entity_access(f.organization_id,f.entity_type,f.entity_id) OR NOT (public.has_role(auth.uid(),'admin') OR public.user_has_permission(auth.uid(),f.organization_id,'me','manage','validation_rules') OR public.user_has_permission(auth.uid(),f.organization_id,'beneficiaries','edit','beneficiaries')) THEN RAISE EXCEPTION 'Not authorised to recheck'; END IF;
 IF nullif(trim(_note),'') IS NULL THEN RAISE EXCEPTION 'Correction note required'; END IF;
 IF f.rule_id IS NULL THEN RAISE EXCEPTION 'Legacy flag has no supported rule; cannot verify correction'; END IF;
 IF app_private.quality_rule_failed(f.rule_id,f.entity_id) THEN RETURN false; END IF;
 UPDATE public.data_quality_flags SET is_resolved=true,resolution_note=_note WHERE id=f.id;
 INSERT INTO public.audit_logs(event_type,entity_type,entity_id,user_id,metadata) VALUES('data_quality_corrected',f.entity_type,f.entity_id,auth.uid(),jsonb_build_object('organization_id',f.organization_id,'issue_id',f.id,'rule_id',f.rule_id,'note',_note)); RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.scan_data_quality(uuid),public.recheck_data_quality_issue(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.scan_data_quality(uuid),public.recheck_data_quality_issue(uuid,text) TO authenticated,service_role;
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.fuzzy_match_beneficiaries(uuid,text,text,date,text,uuid,uuid)'::regprocedure) INTO def;
 def:=replace(def,'BEGIN','BEGIN IF NOT app_private.quality_staff_access(_org_id) THEN RAISE EXCEPTION ''Not authorised''; END IF;');
 def:=replace(def,'AND b.deleted_at IS NULL','AND b.deleted_at IS NULL AND app_private.quality_beneficiary_access(_org_id,b.id) AND NOT EXISTS(SELECT 1 FROM public.duplicate_candidates dc WHERE dc.organization_id=_org_id AND dc.status IN (''reviewed_distinct'',''merged'') AND dc.beneficiary_id_a=least(b.id,_exclude_id) AND dc.beneficiary_id_b=greatest(b.id,_exclude_id))'); EXECUTE def;
 SELECT pg_get_functiondef('public.find_potential_duplicates(uuid)'::regprocedure) INTO def;
 def:=replace(def,'WHERE a.organization_id = _org_id','WHERE app_private.quality_staff_access(_org_id) AND app_private.quality_beneficiary_access(_org_id,a.id) AND app_private.quality_beneficiary_access(_org_id,b.id) AND a.organization_id = _org_id'); EXECUTE def;
END $$;
REVOKE ALL ON FUNCTION public.fuzzy_match_beneficiaries(uuid,text,text,date,text,uuid,uuid),public.find_potential_duplicates(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fuzzy_match_beneficiaries(uuid,text,text,date,text,uuid,uuid),public.find_potential_duplicates(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';