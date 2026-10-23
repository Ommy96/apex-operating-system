CREATE OR REPLACE FUNCTION public.vulnerability_access(_org uuid, _action text DEFAULT 'view') RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.donor_accounts d WHERE d.user_id=auth.uid() AND d.organization_id=_org AND d.is_active=true) AND (public.has_role(auth.uid(),'admin') OR (public.user_belongs_to_org(auth.uid(),_org) AND (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.user_id=auth.uid() AND m.organization_id=_org AND lower(m.role) IN ('owner','admin','org_admin')) OR public.user_has_permission(auth.uid(),_org,'beneficiaries',_action,'assessments') OR (_action='view' AND public.user_has_permission(auth.uid(),_org,'beneficiaries','view','beneficiaries')) OR (_action='create' AND public.user_has_permission(auth.uid(),_org,'beneficiaries','edit','beneficiaries')))));
$$;
REVOKE ALL ON FUNCTION public.vulnerability_access(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.vulnerability_access(uuid,text) TO authenticated,service_role;

CREATE TABLE public.vulnerability_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id), key text NOT NULL, label text NOT NULL, sector text NOT NULL DEFAULT 'general', sensitivity text NOT NULL DEFAULT 'standard', description text, sort_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid, deleted_at timestamptz, UNIQUE(organization_id,key), UNIQUE(organization_id,id)
);
GRANT SELECT,INSERT,UPDATE ON public.vulnerability_categories TO authenticated;
GRANT ALL ON public.vulnerability_categories TO service_role;
ALTER TABLE public.vulnerability_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_read ON public.vulnerability_categories FOR SELECT TO authenticated USING(public.vulnerability_access(organization_id,'view'));
CREATE POLICY categories_create ON public.vulnerability_categories FOR INSERT TO authenticated WITH CHECK(public.vulnerability_access(organization_id,'view') AND (public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=vulnerability_categories.organization_id AND m.user_id=auth.uid() AND lower(m.role) IN ('owner','admin','org_admin')) OR public.user_has_permission(auth.uid(),organization_id,'settings','manage','org_settings')));
CREATE POLICY categories_update ON public.vulnerability_categories FOR UPDATE TO authenticated USING(public.vulnerability_access(organization_id,'view') AND (public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=vulnerability_categories.organization_id AND m.user_id=auth.uid() AND lower(m.role) IN ('owner','admin','org_admin')) OR public.user_has_permission(auth.uid(),organization_id,'settings','manage','org_settings'))) WITH CHECK(public.vulnerability_access(organization_id,'view'));
CREATE POLICY categories_no_delete ON public.vulnerability_categories FOR DELETE TO authenticated USING(false);

CREATE TABLE public.vulnerability_assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id), assessment_id uuid NOT NULL, version integer NOT NULL, previous_version_id uuid REFERENCES public.vulnerability_assessments(id), subject_kind text NOT NULL, beneficiary_id uuid REFERENCES public.beneficiaries(id), household_id uuid REFERENCES public.households(id), entity_id uuid REFERENCES public.entities(id), category_id uuid NOT NULL, category_label text NOT NULL, sensitivity text NOT NULL DEFAULT 'standard', severity text NOT NULL, evidence text NOT NULL, recommended_intervention text NOT NULL, next_review_date date NOT NULL, need_type_ids uuid[] NOT NULL DEFAULT '{}', beneficiary_need_ids uuid[] NOT NULL DEFAULT '{}', scoring_enabled boolean NOT NULL DEFAULT false, scoring_criteria jsonb NOT NULL DEFAULT '[]', score integer, review_decision text NOT NULL DEFAULT 'pending', decision_notes text, reviewer_id uuid, reviewer_name text, reviewed_at timestamptz, assessed_by uuid NOT NULL, assessor_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid, deleted_at timestamptz, UNIQUE(assessment_id,version), FOREIGN KEY(organization_id,category_id) REFERENCES public.vulnerability_categories(organization_id,id)
);
GRANT SELECT ON public.vulnerability_assessments TO authenticated;
GRANT ALL ON public.vulnerability_assessments TO service_role;
ALTER TABLE public.vulnerability_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY assessments_read ON public.vulnerability_assessments FOR SELECT TO authenticated USING(public.vulnerability_access(organization_id,'view') AND (sensitivity='standard' OR public.can_view_sensitive_life_events(organization_id)));
CREATE POLICY assessments_create_via_rpc ON public.vulnerability_assessments FOR INSERT TO authenticated WITH CHECK(false);
CREATE POLICY assessments_no_update ON public.vulnerability_assessments FOR UPDATE TO authenticated USING(false) WITH CHECK(false);
CREATE POLICY assessments_no_delete ON public.vulnerability_assessments FOR DELETE TO authenticated USING(false);
CREATE INDEX assessments_subject_beneficiary ON public.vulnerability_assessments(organization_id,beneficiary_id,created_at DESC);
CREATE INDEX assessments_subject_household ON public.vulnerability_assessments(organization_id,household_id,created_at DESC);
CREATE INDEX assessments_subject_entity ON public.vulnerability_assessments(organization_id,entity_id,created_at DESC);
CREATE INDEX assessments_history ON public.vulnerability_assessments(organization_id,assessment_id,version DESC);

INSERT INTO public.rbac_permissions(module,module_display_name,action,resource,display_name,description)
VALUES ('beneficiaries','Beneficiaries','create','assessments','Capture vulnerability assessments','Capture evidence-based assessments; cannot auto-decide eligibility'),('beneficiaries','Beneficiaries','review','assessments','Review vulnerability assessments','Record human decisions and notes') ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_role_permissions(role_id,permission_id) SELECT r.id,p.id FROM public.rbac_roles r CROSS JOIN public.rbac_permissions p WHERE r.name='org_admin' AND p.module='beneficiaries' AND p.resource='assessments' ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.validate_vulnerability_category() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF btrim(NEW.label)='' OR btrim(NEW.key)='' OR NEW.sensitivity NOT IN ('standard','health','safeguarding') THEN RAISE EXCEPTION 'A category needs a name, key and valid sensitivity'; END IF;
 IF NEW.key IN ('healthcare','safeguarding') AND NEW.sensitivity='standard' THEN RAISE EXCEPTION 'Health and safeguarding categories must remain restricted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.organization_id<>OLD.organization_id THEN RAISE EXCEPTION 'Cannot move a category between organisations'; END IF;
  IF NEW.sensitivity<>OLD.sensitivity AND EXISTS(SELECT 1 FROM public.vulnerability_assessments WHERE category_id=OLD.id) THEN RAISE EXCEPTION 'Sensitivity cannot change after assessments exist; create a new category'; END IF;
 END IF;
 NEW.updated_at=now(); NEW.updated_by=auth.uid(); RETURN NEW;
END $$;
CREATE TRIGGER category_validation BEFORE INSERT OR UPDATE ON public.vulnerability_categories FOR EACH ROW EXECUTE FUNCTION public.validate_vulnerability_category();

INSERT INTO public.vulnerability_categories(organization_id,key,label,sector,sensitivity,sort_order)
SELECT o.id,c.key,c.label,c.sector,c.sensitivity,c.ord + CASE WHEN c.sector=coalesce(cfg.org_type,'general') THEN -20 ELSE 0 END FROM public.organizations o LEFT JOIN public.org_beneficiary_config cfg ON cfg.organization_id=o.id CROSS JOIN (VALUES ('education','Education','education','standard',1),('food_security','Food security','disaster_response','standard',2),('housing','Housing','refugee','standard',3),('healthcare','Healthcare','health','health',4),('disability_support','Disability support','disability','standard',5),('psychosocial','Psychosocial','child_welfare','standard',6),('safeguarding','Safeguarding','child_welfare','safeguarding',7),('economic','Economic','livelihood','standard',8)) c(key,label,sector,sensitivity,ord) ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.seed_vulnerability_categories_on_org() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO public.vulnerability_categories(organization_id,key,label,sector,sensitivity,sort_order) SELECT NEW.id,c.key,c.label,c.sector,c.sensitivity,c.ord FROM (VALUES ('education','Education','education','standard',1),('food_security','Food security','disaster_response','standard',2),('housing','Housing','refugee','standard',3),('healthcare','Healthcare','health','health',4),('disability_support','Disability support','disability','standard',5),('psychosocial','Psychosocial','child_welfare','standard',6),('safeguarding','Safeguarding','child_welfare','safeguarding',7),('economic','Economic','livelihood','standard',8)) c(key,label,sector,sensitivity,ord); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.seed_vulnerability_categories_on_org() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER seed_org_vulnerability_categories AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.seed_vulnerability_categories_on_org();

CREATE OR REPLACE FUNCTION public.immutable_vulnerability_version() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Assessment history is immutable. Create a new version.'; END $$;
CREATE TRIGGER assessments_immutable BEFORE UPDATE OR DELETE ON public.vulnerability_assessments FOR EACH ROW EXECUTE FUNCTION public.immutable_vulnerability_version();

CREATE OR REPLACE FUNCTION public.save_vulnerability_assessment(_org uuid, _payload jsonb, _previous uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.vulnerability_assessments; prev public.vulnerability_assessments; cat public.vulnerability_categories; n uuid; criterion jsonb; pts integer; total integer:=0; who text; ref uuid;
BEGIN
 IF NOT public.vulnerability_access(_org,'create') THEN RAISE EXCEPTION 'Your role cannot capture assessments in this organisation'; END IF;
 IF _previous IS NOT NULL THEN
  SELECT * INTO prev FROM public.vulnerability_assessments WHERE id=_previous AND organization_id=_org;
  IF prev.id IS NULL OR (prev.sensitivity<>'standard' AND NOT public.can_view_sensitive_life_events(_org)) THEN RAISE EXCEPTION 'Previous version not accessible'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(prev.assessment_id::text,0));
  IF EXISTS(SELECT 1 FROM public.vulnerability_assessments WHERE assessment_id=prev.assessment_id AND version>prev.version) THEN RAISE EXCEPTION 'A newer version exists. Reload before editing.'; END IF;
 END IF;
 SELECT * INTO cat FROM public.vulnerability_categories WHERE id=(_payload->>'category_id')::uuid AND organization_id=_org AND is_active AND deleted_at IS NULL;
 IF cat.id IS NULL THEN RAISE EXCEPTION 'Select an active category in this organisation'; END IF;
 v.id=gen_random_uuid(); v.organization_id=_org; v.assessment_id=coalesce(prev.assessment_id,v.id); v.version=coalesce(prev.version,0)+1; v.previous_version_id=prev.id;
 v.subject_kind=lower(_payload->>'subject_kind'); v.beneficiary_id=nullif(_payload->>'beneficiary_id','')::uuid; v.household_id=nullif(_payload->>'household_id','')::uuid; v.entity_id=nullif(_payload->>'entity_id','')::uuid;
 IF num_nonnulls(v.beneficiary_id,v.household_id,v.entity_id)<>1 OR v.subject_kind NOT IN ('beneficiary','household','group','institution') THEN RAISE EXCEPTION 'Select exactly one assessment subject'; END IF;
 IF v.beneficiary_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.beneficiaries b WHERE b.id=v.beneficiary_id AND b.organization_id=_org AND b.deleted_at IS NULL) THEN RAISE EXCEPTION 'Beneficiary is not in this organisation'; END IF;
 IF v.household_id IS NOT NULL AND (v.subject_kind<>'household' OR NOT EXISTS(SELECT 1 FROM public.households h WHERE h.id=v.household_id AND h.organization_id=_org AND h.deleted_at IS NULL)) THEN RAISE EXCEPTION 'Household is not in this organisation'; END IF;
 IF v.entity_id IS NOT NULL AND (v.subject_kind NOT IN ('group','institution') OR NOT EXISTS(SELECT 1 FROM public.entities e WHERE e.id=v.entity_id AND e.organization_id=_org)) THEN RAISE EXCEPTION 'Entity is not in this organisation'; END IF;
 IF prev.id IS NOT NULL AND (v.subject_kind IS DISTINCT FROM prev.subject_kind OR v.beneficiary_id IS DISTINCT FROM prev.beneficiary_id OR v.household_id IS DISTINCT FROM prev.household_id OR v.entity_id IS DISTINCT FROM prev.entity_id) THEN RAISE EXCEPTION 'A revision cannot change its subject'; END IF;
 v.category_id=cat.id; v.category_label=cat.label; v.sensitivity=lower(coalesce(_payload->>'sensitivity',cat.sensitivity));
 IF v.sensitivity NOT IN ('standard','health','safeguarding') THEN RAISE EXCEPTION 'Invalid sensitivity'; END IF;
 IF cat.sensitivity<>'standard' THEN v.sensitivity=cat.sensitivity; END IF;
 IF prev.sensitivity<>'standard' THEN v.sensitivity=prev.sensitivity; END IF;
 IF v.sensitivity<>'standard' AND NOT public.can_view_sensitive_life_events(_org) THEN RAISE EXCEPTION 'Sensitive life-event access is required for health or safeguarding assessments'; END IF;
 v.severity=lower(_payload->>'severity'); v.evidence=btrim(_payload->>'evidence'); v.recommended_intervention=btrim(_payload->>'recommended_intervention'); v.next_review_date=(_payload->>'next_review_date')::date;
 IF v.severity IS NULL OR v.severity NOT IN ('low','medium','high','critical') OR coalesce(v.evidence,'')='' OR coalesce(v.recommended_intervention,'')='' OR v.next_review_date IS NULL THEN RAISE EXCEPTION 'Evidence, severity, intervention and next review date are required'; END IF;
 v.need_type_ids=ARRAY(SELECT jsonb_array_elements_text(coalesce(_payload->'need_type_ids','[]'))::uuid); v.beneficiary_need_ids=ARRAY(SELECT jsonb_array_elements_text(coalesce(_payload->'beneficiary_need_ids','[]'))::uuid);
 FOREACH n IN ARRAY v.need_type_ids LOOP IF NOT EXISTS(SELECT 1 FROM public.need_types t WHERE t.id=n AND t.organization_id=_org) THEN RAISE EXCEPTION 'Need type is not in this organisation'; END IF; END LOOP;
 FOREACH n IN ARRAY v.beneficiary_need_ids LOOP
 IF NOT EXISTS(SELECT 1 FROM public.beneficiary_needs bn JOIN public.beneficiaries b ON b.id=bn.beneficiary_id WHERE bn.id=n AND bn.organization_id=_org AND b.organization_id=_org AND (b.id=v.beneficiary_id OR b.household_id=v.household_id)) THEN RAISE EXCEPTION 'Justified need must belong to the assessed beneficiary or household'; END IF;
 END LOOP;
 v.scoring_enabled=coalesce((_payload->>'scoring_enabled')::boolean,false); v.scoring_criteria='[]';
 IF v.scoring_enabled THEN
  IF jsonb_array_length(coalesce(_payload->'scoring_criteria','[]'))<>3 THEN RAISE EXCEPTION 'All three scoring criteria are required'; END IF;
  FOR criterion IN SELECT value FROM jsonb_array_elements(_payload->'scoring_criteria') LOOP
   pts=(criterion->>'points')::integer;
   IF pts IS NULL OR pts<0 OR pts>4 THEN RAISE EXCEPTION 'Criteria points must be 0 to 4'; END IF; total=total+pts;
  END LOOP;
  v.scoring_criteria=jsonb_build_array(jsonb_build_object('key','access','label','Access to essential services','definition','0: no barrier; 1: minor; 2: moderate; 3: major; 4: no access','points',(_payload->'scoring_criteria'->0->>'points')::integer),jsonb_build_object('key','impact','label','Impact on daily life','definition','0: none; 1: minor; 2: moderate; 3: major; 4: unable to meet daily needs','points',(_payload->'scoring_criteria'->1->>'points')::integer),jsonb_build_object('key','support','label','Available support','definition','0: reliable support; 1: mostly reliable; 2: partial; 3: minimal; 4: none','points',(_payload->'scoring_criteria'->2->>'points')::integer));
  v.score=round(total*100.0/12);
 END IF;
 v.review_decision=lower(coalesce(_payload->>'review_decision','pending'));
 IF v.review_decision NOT IN ('pending','support_required','monitor','no_action') THEN RAISE EXCEPTION 'Invalid human decision'; END IF;
 IF v.review_decision<>'pending' THEN
  IF NOT public.vulnerability_access(_org,'review') THEN RAISE EXCEPTION 'Your role cannot record assessment decisions'; END IF;
  v.decision_notes=btrim(_payload->>'decision_notes'); IF coalesce(v.decision_notes,'')='' THEN RAISE EXCEPTION 'Human review requires decision notes'; END IF;
  v.reviewer_id=auth.uid(); SELECT coalesce(p.full_name,'Reviewer') INTO who FROM public.profiles p WHERE p.id=auth.uid(); v.reviewer_name=coalesce(who,'Reviewer'); v.reviewed_at=now();
 END IF;
 SELECT coalesce(p.full_name,'Staff member') INTO who FROM public.profiles p WHERE p.id=auth.uid();
 v.assessed_by=auth.uid(); v.assessor_name=coalesce(who,'Staff member'); v.created_at=now(); v.updated_at=now(); v.updated_by=auth.uid();
 INSERT INTO public.vulnerability_assessments SELECT v.*;
 RETURN v.id;
END $$;
REVOKE ALL ON FUNCTION public.save_vulnerability_assessment(uuid,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_vulnerability_assessment(uuid,jsonb,uuid) TO authenticated;

ALTER TABLE public.waitlist_applications ADD COLUMN assessment_priority integer NOT NULL DEFAULT 0, ADD COLUMN household_id uuid REFERENCES public.households(id), ADD COLUMN entity_id uuid REFERENCES public.entities(id);
CREATE INDEX waitlist_assessment_subject ON public.waitlist_applications(organization_id,beneficiary_id,household_id,entity_id);
CREATE OR REPLACE FUNCTION public.vulnerability_safe_priority(_org uuid,_ben uuid,_house uuid,_entity uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce((SELECT CASE WHEN a.sensitivity='standard' AND a.review_decision='support_required' THEN CASE WHEN a.scoring_enabled THEN round(a.score*0.3)::integer ELSE CASE a.severity WHEN 'critical' THEN 30 WHEN 'high' THEN 20 WHEN 'medium' THEN 10 ELSE 5 END END ELSE 0 END FROM public.vulnerability_assessments a WHERE a.organization_id=_org AND ((a.beneficiary_id=_ben AND _ben IS NOT NULL) OR (a.household_id=_house AND _house IS NOT NULL) OR (a.entity_id=_entity AND _entity IS NOT NULL)) ORDER BY a.created_at DESC,a.version DESC LIMIT 1),0);
$$;
REVOKE ALL ON FUNCTION public.vulnerability_safe_priority(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.derive_waitlist_assessment_priority() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 NEW.assessment_priority=public.vulnerability_safe_priority(NEW.organization_id,NEW.beneficiary_id,NEW.household_id,NEW.entity_id); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.derive_waitlist_assessment_priority() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER derive_waitlist_assessment_priority BEFORE INSERT OR UPDATE ON public.waitlist_applications FOR EACH ROW EXECUTE FUNCTION public.derive_waitlist_assessment_priority();
CREATE OR REPLACE FUNCTION public.derive_beneficiary_vulnerability_summary() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE latest public.vulnerability_assessments; BEGIN
 SELECT * INTO latest FROM public.vulnerability_assessments WHERE organization_id=NEW.organization_id AND beneficiary_id=NEW.id ORDER BY created_at DESC,version DESC LIMIT 1;
 IF latest.id IS NOT NULL THEN
  IF latest.sensitivity='standard' AND latest.review_decision<>'pending' THEN NEW.vulnerability_level=latest.severity; NEW.vulnerability_tags=ARRAY[latest.category_label];
  ELSE NEW.vulnerability_level=NULL; NEW.vulnerability_tags='{}'; END IF;
 END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.derive_beneficiary_vulnerability_summary() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER derive_beneficiary_vulnerability_summary BEFORE UPDATE ON public.beneficiaries FOR EACH ROW EXECUTE FUNCTION public.derive_beneficiary_vulnerability_summary();
CREATE OR REPLACE FUNCTION public.sync_vulnerability_assessment_outcome() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.beneficiary_id IS NOT NULL THEN UPDATE public.beneficiaries SET updated_at=now(),updated_by=NEW.updated_by WHERE id=NEW.beneficiary_id AND organization_id=NEW.organization_id; END IF;
 UPDATE public.waitlist_applications SET updated_at=now() WHERE organization_id=NEW.organization_id AND ((beneficiary_id=NEW.beneficiary_id AND NEW.beneficiary_id IS NOT NULL) OR (household_id=NEW.household_id AND NEW.household_id IS NOT NULL) OR (entity_id=NEW.entity_id AND NEW.entity_id IS NOT NULL));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_vulnerability_assessment_outcome() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_vulnerability_outcome AFTER INSERT ON public.vulnerability_assessments FOR EACH ROW EXECUTE FUNCTION public.sync_vulnerability_assessment_outcome();
ALTER PUBLICATION supabase_realtime ADD TABLE public.vulnerability_assessments;
NOTIFY pgrst, 'reload schema';