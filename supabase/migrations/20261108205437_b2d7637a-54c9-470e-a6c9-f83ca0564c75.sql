CREATE OR REPLACE FUNCTION app_private.quality_merge_access(_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT app_private.quality_staff_access(_org) AND (public.has_role(auth.uid(),'admin') OR public.user_has_permission(auth.uid(),_org,'beneficiaries','delete','beneficiaries')) $$;
ALTER TABLE public.duplicate_candidates ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS updated_by uuid, ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP POLICY IF EXISTS "Org admins delete duplicate_candidates" ON public.duplicate_candidates;
DROP POLICY IF EXISTS "Org members insert duplicate_candidates" ON public.duplicate_candidates;
DROP POLICY IF EXISTS "Org members read duplicate_candidates" ON public.duplicate_candidates;
DROP POLICY IF EXISTS "Org members update duplicate_candidates" ON public.duplicate_candidates;
CREATE POLICY quality_duplicates_read ON public.duplicate_candidates FOR SELECT TO authenticated USING(deleted_at IS NULL AND app_private.quality_beneficiary_access(organization_id,beneficiary_id_a) AND app_private.quality_beneficiary_access(organization_id,beneficiary_id_b));
CREATE POLICY quality_duplicates_create ON public.duplicate_candidates FOR INSERT TO authenticated WITH CHECK(app_private.quality_beneficiary_access(organization_id,beneficiary_id_a) AND app_private.quality_beneficiary_access(organization_id,beneficiary_id_b) AND public.user_has_permission(auth.uid(),organization_id,'beneficiaries','edit','beneficiaries'));
CREATE POLICY quality_duplicates_update ON public.duplicate_candidates FOR UPDATE TO authenticated USING(app_private.quality_merge_access(organization_id) AND app_private.quality_beneficiary_access(organization_id,beneficiary_id_a) AND app_private.quality_beneficiary_access(organization_id,beneficiary_id_b)) WITH CHECK(app_private.quality_merge_access(organization_id) AND app_private.quality_beneficiary_access(organization_id,beneficiary_id_a) AND app_private.quality_beneficiary_access(organization_id,beneficiary_id_b));
CREATE POLICY quality_duplicates_no_delete ON public.duplicate_candidates FOR DELETE TO authenticated USING(false);
CREATE FUNCTION app_private.confirm_duplicate_distinct(_candidate uuid,_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c public.duplicate_candidates; BEGIN
 SELECT * INTO c FROM public.duplicate_candidates WHERE id=_candidate AND status='pending' FOR UPDATE;
 IF c.id IS NULL OR NOT app_private.quality_beneficiary_access(c.organization_id,c.beneficiary_id_a) OR NOT app_private.quality_beneficiary_access(c.organization_id,c.beneficiary_id_b) OR NOT (public.has_role(auth.uid(),'admin') OR public.user_has_permission(auth.uid(),c.organization_id,'beneficiaries','edit','beneficiaries')) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF nullif(trim(_note),'') IS NULL THEN RAISE EXCEPTION 'Decision reason required'; END IF;
 UPDATE public.duplicate_candidates SET status='reviewed_distinct',resolution_note=_note,resolved_by=auth.uid(),resolved_at=now(),updated_by=auth.uid(),updated_at=now() WHERE id=c.id;
 INSERT INTO public.dedup_decisions(organization_id,beneficiary_id_a,beneficiary_id_b,decision,decided_by) VALUES(c.organization_id,c.beneficiary_id_a,c.beneficiary_id_b,'not_duplicate',auth.uid());
 INSERT INTO public.audit_logs(event_type,entity_type,entity_id,user_id,metadata) VALUES('duplicate_confirmed_different','beneficiary',c.beneficiary_id_a,auth.uid(),jsonb_build_object('organization_id',c.organization_id,'candidate_id',c.id,'other_id',c.beneficiary_id_b,'reason',_note)); RETURN c.id;
END $$;
CREATE FUNCTION public.confirm_duplicate_distinct(_candidate uuid,_note text) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT app_private.confirm_duplicate_distinct(_candidate,_note) $$;
CREATE FUNCTION app_private.quality_merge_manifest(_canonical uuid,_duplicate uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE org uuid; rel record; ids jsonb; links jsonb:='[]'::jsonb; blocked boolean; BEGIN
 SELECT organization_id INTO org FROM public.beneficiaries WHERE id=_canonical AND deleted_at IS NULL;
 IF org IS NULL OR _canonical=_duplicate OR NOT app_private.quality_merge_access(org) OR NOT app_private.quality_beneficiary_access(org,_canonical) OR NOT app_private.quality_beneficiary_access(org,_duplicate) THEN RAISE EXCEPTION 'Both active records must be permitted and in the same organisation'; END IF;
 FOR rel IN SELECT c.table_name,c.column_name FROM information_schema.columns c JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE' WHERE c.table_schema='public' AND c.column_name='beneficiary_id' AND c.table_name=ANY(ARRAY['activity_disbursements','activity_participants','allocation_line_items','allocations','beneficiary_academics','beneficiary_baselines','beneficiary_cases','beneficiary_donors','beneficiary_eligibility_scores','beneficiary_field_values','beneficiary_guardians','beneficiary_needs','beneficiary_out_of_system_contacts','beneficiary_progress_logs','beneficiary_progression_history','beneficiary_risk_scores','beneficiary_services','beneficiary_siblings','beneficiary_uploads','beneficiary_visitations','case_entries','cash_transfers','complaints','consent_documents','consent_records','data_access_requests','donation_campaigns','field_check_ins','field_logs','financial_transactions','home_visits','household_memberships','impact_stories','life_events','program_observations','program_visits','school_visits','sponsor_correspondence','sponsor_relationships','sponsorship_updates','survey_responses','visit_requests','waitlist_applications','vulnerability_assessments','beneficiary_share_links']) ORDER BY c.table_name LOOP
 EXECUTE format('SELECT coalesce(jsonb_agg(id ORDER BY id),''[]''::jsonb) FROM public.%I WHERE beneficiary_id=$1',rel.table_name) INTO ids USING _duplicate;
 IF jsonb_array_length(ids)>0 THEN links:=links||jsonb_build_array(jsonb_build_object('table',rel.table_name,'column',rel.column_name,'ids',ids,'action',CASE WHEN rel.table_name='vulnerability_assessments' THEN 'blocked_immutable' ELSE 'repoint_preserving_ids' END)); END IF;
 END LOOP;
 SELECT coalesce(jsonb_agg(id ORDER BY id),'[]'::jsonb) INTO ids FROM public.staff_tasks WHERE (related_record_type='beneficiary' AND related_record_id=_duplicate) OR (source_record_type='beneficiary' AND source_record_id=_duplicate) OR case_id IN(SELECT id FROM public.beneficiary_cases WHERE beneficiary_id=_duplicate);
 IF jsonb_array_length(ids)>0 THEN links:=links||jsonb_build_array(jsonb_build_object('table','staff_tasks','ids',ids,'action','preserve_task_and_source_identity')); END IF;
 SELECT coalesce(jsonb_agg(id ORDER BY id),'[]'::jsonb) INTO ids FROM public.documents WHERE child_id IN(SELECT id FROM public.children WHERE beneficiary_id=_duplicate);
 IF jsonb_array_length(ids)>0 THEN links:=links||jsonb_build_array(jsonb_build_object('table','documents','ids',ids,'action','preserve_child_and_private_file_ids')); END IF;
 blocked:=EXISTS(SELECT 1 FROM public.vulnerability_assessments WHERE beneficiary_id=_duplicate);
 RETURN jsonb_build_object('canonical_id',_canonical,'duplicate_id',_duplicate,'links',links,'blocked',blocked,'limitation',CASE WHEN blocked THEN 'Immutable assessments cannot be reassigned. Resolve through reviewed history migration; no records will be changed.' ELSE 'Uniqueness conflicts abort the entire merge. Source task identities and private files remain unchanged.' END);
END $$;
CREATE FUNCTION public.preview_beneficiary_merge(_canonical uuid,_duplicate uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT app_private.quality_merge_manifest(_canonical,_duplicate) $$;
CREATE OR REPLACE FUNCTION public.merge_beneficiaries(_candidate_id uuid,_canonical_id uuid,_duplicate_id uuid,_note text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'A fresh preserved-link preview is required. Use reviewed merge.'; END $$;
CREATE FUNCTION app_private.reviewed_beneficiary_merge(_candidate uuid,_canonical uuid,_duplicate uuid,_note text,_preview jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.duplicate_candidates; manifest jsonb; link jsonb; org uuid; BEGIN
 SELECT * INTO c FROM public.duplicate_candidates WHERE id=_candidate AND status='pending' FOR UPDATE;
 IF c.id IS NULL OR c.beneficiary_id_a<>least(_canonical,_duplicate) OR c.beneficiary_id_b<>greatest(_canonical,_duplicate) OR nullif(trim(_note),'') IS NULL THEN RAISE EXCEPTION 'Pending candidate pair and reason required'; END IF;
 PERFORM 1 FROM public.beneficiaries WHERE id IN(_canonical,_duplicate) ORDER BY id FOR UPDATE;
 manifest:=app_private.quality_merge_manifest(_canonical,_duplicate);
 IF manifest IS DISTINCT FROM _preview THEN RAISE EXCEPTION 'Links changed. Refresh the preview before merging.'; END IF;
 IF (manifest->>'blocked')::boolean THEN RAISE EXCEPTION 'Merge blocked to preserve immutable assessment history'; END IF;
 org:=c.organization_id;
 FOR link IN SELECT value FROM jsonb_array_elements(manifest->'links') LOOP
 IF link->>'action'='repoint_preserving_ids' THEN
 EXECUTE format('UPDATE public.%I SET beneficiary_id=$1 WHERE beneficiary_id=$2',link->>'table') USING _canonical,_duplicate;
 END IF;
 END LOOP;
 UPDATE public.staff_tasks SET related_record_id=_canonical WHERE organization_id=org AND related_record_type='beneficiary' AND related_record_id=_duplicate;
 UPDATE public.children SET beneficiary_id=_canonical WHERE beneficiary_id=_duplicate;
 UPDATE public.beneficiaries SET deleted_at=now(),updated_at=now(),updated_by=auth.uid() WHERE id=_duplicate AND organization_id=org;
 UPDATE public.duplicate_candidates SET status='merged',resolution_note=_note,resolved_by=auth.uid(),resolved_at=now(),updated_at=now(),updated_by=auth.uid() WHERE id=c.id;
 INSERT INTO public.audit_logs(event_type,entity_type,entity_id,user_id,metadata) VALUES('beneficiary_merge','beneficiary',_canonical,auth.uid(),jsonb_build_object('organization_id',org,'candidate_id',c.id,'reason',_note,'preserved_links',manifest));
 RETURN manifest;
END $$;
CREATE FUNCTION public.reviewed_beneficiary_merge(_candidate uuid,_canonical uuid,_duplicate uuid,_note text,_preview jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT app_private.reviewed_beneficiary_merge(_candidate,_canonical,_duplicate,_note,_preview) $$;
REVOKE ALL ON FUNCTION public.confirm_duplicate_distinct(uuid,text),public.preview_beneficiary_merge(uuid,uuid),public.reviewed_beneficiary_merge(uuid,uuid,uuid,text,jsonb),app_private.confirm_duplicate_distinct(uuid,text),app_private.quality_merge_manifest(uuid,uuid),app_private.reviewed_beneficiary_merge(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_duplicate_distinct(uuid,text),public.preview_beneficiary_merge(uuid,uuid),public.reviewed_beneficiary_merge(uuid,uuid,uuid,text,jsonb),app_private.confirm_duplicate_distinct(uuid,text),app_private.quality_merge_manifest(uuid,uuid),app_private.reviewed_beneficiary_merge(uuid,uuid,uuid,text,jsonb) TO authenticated;
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('app_private.quality_rule_failed(uuid,uuid)'::regprocedure) INTO def;
 def:=replace(def,'ELSE bid:=_record; END IF;','IF bid IS NULL THEN SELECT c.beneficiary_id,(c.deleted_at IS NULL AND c.status IN (''active'',''expired'') AND c.expires_at<current_date) INTO bid,expired FROM public.consent_documents c WHERE c.id=_record AND c.organization_id=r.organization_id; END IF; ELSE bid:=_record; END IF;');
 -- Insert document fallback into expired-consent branch, not need branch.
 def:=replace(def,'ELSIF r.template_key=''need_without_assessment'' THEN','IF bid IS NULL THEN SELECT c.beneficiary_id,(c.deleted_at IS NULL AND c.status IN (''active'',''expired'') AND c.expires_at<current_date) INTO bid,expired FROM public.consent_documents c WHERE c.id=_record AND c.organization_id=r.organization_id; END IF; ELSIF r.template_key=''need_without_assessment'' THEN');
 EXECUTE def;
 SELECT pg_get_functiondef('app_private.scan_data_quality(uuid)'::regprocedure) INTO def;
 def:=replace(def,'UNION ALL SELECT nn.id','UNION ALL SELECT cd.id,cd.beneficiary_id,''consent_document'' FROM public.consent_documents cd WHERE r.template_key=''expired_consent'' AND cd.organization_id=_org AND cd.beneficiary_id IS NOT NULL AND cd.deleted_at IS NULL UNION ALL SELECT nn.id'); EXECUTE def;
END $$;
CREATE OR REPLACE FUNCTION public.flag_expired_consent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.expires_at IS NOT NULL AND NEW.expires_at<current_date AND NEW.status='active' THEN NEW.status:='expired'; END IF; RETURN NEW; END $$;
REVOKE ALL ON public.data_quality_flags,public.duplicate_candidates,public.dedup_decisions FROM anon;
NOTIFY pgrst,'reload schema';