REVOKE INSERT,UPDATE,DELETE ON public.vulnerability_assessments FROM authenticated;
REVOKE DELETE ON public.vulnerability_categories FROM authenticated;
CREATE OR REPLACE FUNCTION public.can_read_vulnerability_history(_org uuid,_assessment uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.vulnerability_access(_org,'view') AND (public.can_view_sensitive_life_events(_org) OR NOT EXISTS(SELECT 1 FROM public.vulnerability_assessments a WHERE a.organization_id=_org AND a.assessment_id=_assessment AND a.sensitivity<>'standard'));
$$;
REVOKE ALL ON FUNCTION public.can_read_vulnerability_history(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_vulnerability_history(uuid,uuid) TO authenticated;
ALTER POLICY assessments_read ON public.vulnerability_assessments USING(public.can_read_vulnerability_history(organization_id,assessment_id));
ALTER POLICY categories_update ON public.vulnerability_categories WITH CHECK(public.vulnerability_access(organization_id,'view') AND (public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=vulnerability_categories.organization_id AND m.user_id=auth.uid() AND lower(m.role) IN ('owner','admin','org_admin')) OR public.user_has_permission(auth.uid(),organization_id,'settings','manage','org_settings')));
CREATE OR REPLACE FUNCTION public.validate_vulnerability_version_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE prior public.vulnerability_assessments; BEGIN
 IF NOT public.vulnerability_access(NEW.organization_id,'create') THEN RAISE EXCEPTION 'Assessment capture permission required'; END IF;
 IF NEW.previous_version_id IS NOT NULL THEN
  SELECT * INTO prior FROM public.vulnerability_assessments WHERE id=NEW.previous_version_id;
  IF prior.organization_id IS DISTINCT FROM NEW.organization_id OR prior.assessment_id IS DISTINCT FROM NEW.assessment_id OR NEW.version<>prior.version+1 THEN RAISE EXCEPTION 'Invalid assessment history link'; END IF;
  IF prior.review_decision<>'pending' AND NOT public.vulnerability_access(NEW.organization_id,'review') THEN RAISE EXCEPTION 'Review authority is required to revise a reviewed assessment'; END IF;
 ELSE
  IF NEW.assessment_id<>NEW.id OR NEW.version<>1 THEN RAISE EXCEPTION 'Invalid initial assessment version'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.vulnerability_assessments WHERE assessment_id=NEW.assessment_id AND organization_id<>NEW.organization_id) THEN RAISE EXCEPTION 'Invalid organisation history'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_vulnerability_version_insert() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_vulnerability_version BEFORE INSERT ON public.vulnerability_assessments FOR EACH ROW EXECUTE FUNCTION public.validate_vulnerability_version_insert();
CREATE OR REPLACE FUNCTION public.add_assessment_to_waitlist(_assessment uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a public.vulnerability_assessments; result uuid; label text; BEGIN
 SELECT * INTO a FROM public.vulnerability_assessments WHERE id=_assessment;
 IF a.id IS NULL OR NOT public.vulnerability_access(a.organization_id,'create') OR NOT public.can_read_vulnerability_history(a.organization_id,a.assessment_id) THEN RAISE EXCEPTION 'Assessment not accessible'; END IF;
 IF a.review_decision='pending' THEN RAISE EXCEPTION 'Human review is required before adding to the waiting list'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(a.beneficiary_id,a.household_id,a.entity_id)::text,0));
 SELECT id INTO result FROM public.waitlist_applications w WHERE w.organization_id=a.organization_id AND ((w.beneficiary_id=a.beneficiary_id AND a.beneficiary_id IS NOT NULL) OR (w.household_id=a.household_id AND a.household_id IS NOT NULL) OR (w.entity_id=a.entity_id AND a.entity_id IS NOT NULL)) AND w.status NOT IN ('declined','enrolled') LIMIT 1;
 IF result IS NOT NULL THEN RETURN result; END IF;
 IF a.beneficiary_id IS NOT NULL THEN SELECT display_name INTO label FROM public.beneficiaries WHERE id=a.beneficiary_id AND organization_id=a.organization_id;
 ELSIF a.household_id IS NOT NULL THEN SELECT household_name INTO label FROM public.households WHERE id=a.household_id AND organization_id=a.organization_id;
 ELSE SELECT display_name INTO label FROM public.entities WHERE id=a.entity_id AND organization_id=a.organization_id; END IF;
 INSERT INTO public.waitlist_applications(organization_id,beneficiary_id,household_id,entity_id,applicant_name,status,vulnerability_score) VALUES(a.organization_id,a.beneficiary_id,a.household_id,a.entity_id,label,'waiting_list',0) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.add_assessment_to_waitlist(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_assessment_to_waitlist(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';