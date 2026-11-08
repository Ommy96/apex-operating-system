CREATE OR REPLACE FUNCTION app_private.user_is_project_scoped(_user_id uuid,_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,app_private AS $$
  SELECT NOT public.user_is_org_elevated(_user_id,_org_id)
    AND public.user_has_only_roles(_user_id,_org_id,ARRAY['project_manager']);
$$;

CREATE OR REPLACE FUNCTION app_private.case_is_visible_scoped(_user_id uuid,_case_id uuid,_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,app_private AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.beneficiary_cases c
    WHERE c.id=_case_id AND c.organization_id=_org_id AND c.deleted_at IS NULL
      AND public.user_belongs_to_org(_user_id,_org_id)
      AND NOT app_private.user_is_donor_for_org(_user_id,_org_id)
      AND (NOT c.is_sensitive OR public.user_is_org_elevated(_user_id,_org_id) OR public.user_has_permission(_user_id,_org_id,'cases','view','sensitive'))
      AND (
        public.user_is_org_elevated(_user_id,_org_id)
        OR (NOT public.user_is_field_scoped(_user_id,_org_id) AND NOT public.user_is_program_scoped(_user_id,_org_id) AND NOT app_private.user_is_project_scoped(_user_id,_org_id))
        OR (public.user_is_program_scoped(_user_id,_org_id) AND (
          c.assigned_to=_user_id OR c.created_by=_user_id
          OR c.program_id IN (SELECT public.user_assigned_program_ids(_user_id,_org_id))
          OR EXISTS (SELECT 1 FROM public.beneficiary_services bs WHERE bs.organization_id=_org_id AND bs.beneficiary_id=c.beneficiary_id AND bs.program_id IN (SELECT public.user_assigned_program_ids(_user_id,_org_id)))
        ))
        OR (app_private.user_is_project_scoped(_user_id,_org_id) AND (
          c.assigned_to=_user_id OR c.created_by=_user_id
          OR EXISTS (SELECT 1 FROM public.beneficiary_services bs WHERE bs.organization_id=_org_id AND bs.beneficiary_id=c.beneficiary_id AND bs.project_id IN (SELECT public.user_assigned_project_ids(_user_id,_org_id)))
        ))
        OR (public.user_is_field_scoped(_user_id,_org_id) AND (c.assigned_to=_user_id OR c.created_by=_user_id OR public.beneficiary_visible_scoped(_user_id,c.beneficiary_id,_org_id)))
      )
  )
$$;

CREATE OR REPLACE FUNCTION app_private.staff_task_is_visible_scoped(_user_id uuid,_task_id uuid,_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,app_private AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_tasks t
    WHERE t.id=_task_id AND t.organization_id=_org_id
      AND public.user_belongs_to_org(_user_id,_org_id)
      AND NOT app_private.user_is_donor_for_org(_user_id,_org_id)
      AND (NOT t.is_sensitive OR public.user_is_org_elevated(_user_id,_org_id) OR public.user_has_permission(_user_id,_org_id,'cases','view','sensitive'))
      AND (t.case_id IS NULL OR app_private.case_is_visible_scoped(_user_id,t.case_id,_org_id))
      AND (
        public.user_is_org_elevated(_user_id,_org_id)
        OR (NOT public.user_is_field_scoped(_user_id,_org_id) AND NOT public.user_is_program_scoped(_user_id,_org_id) AND NOT app_private.user_is_project_scoped(_user_id,_org_id))
        OR (public.user_is_program_scoped(_user_id,_org_id) AND (
          t.assigned_to=_user_id OR t.assigned_by=_user_id
          OR t.program_id IN (SELECT public.user_assigned_program_ids(_user_id,_org_id))
          OR t.project_id IN (SELECT public.user_assigned_project_ids(_user_id,_org_id))
          OR (t.case_id IS NOT NULL AND app_private.case_is_visible_scoped(_user_id,t.case_id,_org_id))
        ))
        OR (app_private.user_is_project_scoped(_user_id,_org_id) AND (
          t.assigned_to=_user_id OR t.assigned_by=_user_id
          OR t.project_id IN (SELECT public.user_assigned_project_ids(_user_id,_org_id))
          OR (t.case_id IS NOT NULL AND app_private.case_is_visible_scoped(_user_id,t.case_id,_org_id))
        ))
        OR (public.user_is_field_scoped(_user_id,_org_id) AND (
          t.assigned_to=_user_id OR t.assigned_by=_user_id
          OR (t.case_id IS NOT NULL AND app_private.case_is_visible_scoped(_user_id,t.case_id,_org_id))
        ))
      )
  )
$$;

CREATE OR REPLACE FUNCTION app_private.validate_beneficiary_case_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,app_private AS $$
DECLARE manage boolean; scoped_ok boolean:=true;
BEGIN
  manage:=auth.role()='service_role' OR public.user_is_org_elevated(auth.uid(),NEW.organization_id) OR public.user_has_permission(auth.uid(),NEW.organization_id,'cases','manage','cases');
  IF TG_OP='INSERT' THEN
    IF auth.role()<>'service_role' AND (NOT public.user_belongs_to_org(auth.uid(),NEW.organization_id) OR NOT manage) THEN RAISE EXCEPTION 'Case management permission required'; END IF;
  ELSE
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.beneficiary_id IS DISTINCT FROM OLD.beneficiary_id THEN RAISE EXCEPTION 'Case organisation and beneficiary cannot change'; END IF;
    IF NOT manage AND OLD.assigned_to=auth.uid() THEN
      IF (to_jsonb(NEW)-ARRAY['case_status','closed_date','closure_reason','updated_by','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['case_status','closed_date','closure_reason','updated_by','updated_at']) THEN RAISE EXCEPTION 'Assigned staff may only progress or close their case'; END IF;
    ELSIF NOT manage THEN RAISE EXCEPTION 'Not authorised to edit this case'; END IF;
    IF NEW.case_status IS DISTINCT FROM OLD.case_status AND NOT ((OLD.case_status='open' AND NEW.case_status IN ('in_progress','referred','resolved','closed','lost_to_follow_up')) OR (OLD.case_status='in_progress' AND NEW.case_status IN ('open','referred','resolved','closed','lost_to_follow_up')) OR (OLD.case_status='referred' AND NEW.case_status IN ('in_progress','resolved','closed','lost_to_follow_up')) OR (OLD.case_status='resolved' AND NEW.case_status IN ('in_progress','closed'))) THEN RAISE EXCEPTION 'Invalid case status transition: % to %',OLD.case_status,NEW.case_status; END IF;
  END IF;
  IF auth.role()<>'service_role' AND NOT public.user_is_org_elevated(auth.uid(),NEW.organization_id) THEN
    IF public.user_is_field_scoped(auth.uid(),NEW.organization_id) THEN
      scoped_ok:=public.beneficiary_visible_scoped(auth.uid(),NEW.beneficiary_id,NEW.organization_id);
    ELSIF public.user_is_program_scoped(auth.uid(),NEW.organization_id) THEN
      scoped_ok:=NEW.program_id IN (SELECT public.user_assigned_program_ids(auth.uid(),NEW.organization_id)) OR EXISTS(SELECT 1 FROM public.beneficiary_services bs WHERE bs.organization_id=NEW.organization_id AND bs.beneficiary_id=NEW.beneficiary_id AND bs.program_id IN (SELECT public.user_assigned_program_ids(auth.uid(),NEW.organization_id)));
    ELSIF app_private.user_is_project_scoped(auth.uid(),NEW.organization_id) THEN
      scoped_ok:=EXISTS(SELECT 1 FROM public.beneficiary_services bs WHERE bs.organization_id=NEW.organization_id AND bs.beneficiary_id=NEW.beneficiary_id AND bs.project_id IN (SELECT public.user_assigned_project_ids(auth.uid(),NEW.organization_id)));
    END IF;
    IF NOT scoped_ok THEN RAISE EXCEPTION 'Case beneficiary is outside your assigned scope'; END IF;
  END IF;
  IF NEW.assigned_to IS NOT NULL AND NOT public.user_belongs_to_org(NEW.assigned_to,NEW.organization_id) THEN RAISE EXCEPTION 'Case assignee must belong to case organisation'; END IF;
  IF NEW.case_status IN ('resolved','closed','lost_to_follow_up') THEN
    IF NULLIF(btrim(NEW.closure_reason),'') IS NULL THEN RAISE EXCEPTION 'A reason is required to close or resolve a case'; END IF;
    NEW.closed_date:=COALESCE(NEW.closed_date,CURRENT_DATE);
  ELSE NEW.closed_date:=NULL; NEW.closure_reason:=NULL; END IF;
  IF NEW.is_sensitive AND auth.role()<>'service_role' AND NOT (public.user_is_org_elevated(auth.uid(),NEW.organization_id) OR public.user_has_permission(auth.uid(),NEW.organization_id,'cases','view','sensitive')) THEN RAISE EXCEPTION 'Sensitive case permission required'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION app_private.validate_staff_task_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,app_private AS $$
DECLARE co uuid; cs boolean; rs boolean:=false; ss boolean:=false; source_beneficiary uuid; source_assessment uuid; source_household uuid; source_sensitivity text; manage boolean; scoped_ok boolean:=true;
BEGIN
  manage:=auth.role()='service_role' OR public.user_is_org_elevated(auth.uid(),NEW.organization_id) OR public.user_has_permission(auth.uid(),NEW.organization_id,'tasks','manage','tasks');
  IF TG_OP='UPDATE' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'Task organisation cannot change'; END IF;
    IF (NEW.source_event_type,NEW.source_record_type,NEW.source_record_id) IS DISTINCT FROM (OLD.source_event_type,OLD.source_record_type,OLD.source_record_id) THEN RAISE EXCEPTION 'Task source key is immutable'; END IF;
    IF NOT manage AND OLD.assigned_to=auth.uid() THEN
      IF (to_jsonb(NEW)-ARRAY['status','completed_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','completed_at','updated_at']) THEN RAISE EXCEPTION 'Assigned staff may only progress their task'; END IF;
    ELSIF NOT manage THEN RAISE EXCEPTION 'Not authorised to edit this task'; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT ((OLD.status='todo' AND NEW.status IN ('in_progress','cancelled')) OR (OLD.status='in_progress' AND NEW.status IN ('todo','blocked','completed','cancelled')) OR (OLD.status='blocked' AND NEW.status IN ('in_progress','cancelled'))) THEN RAISE EXCEPTION 'Invalid task status transition: % to %',OLD.status,NEW.status; END IF;
  ELSIF auth.role()<>'service_role' AND (NOT public.user_belongs_to_org(auth.uid(),NEW.organization_id) OR NOT manage) THEN RAISE EXCEPTION 'Task management permission required';
  END IF;
  IF NEW.assigned_to IS NOT NULL AND NOT public.user_belongs_to_org(NEW.assigned_to,NEW.organization_id) THEN RAISE EXCEPTION 'Assignee must belong to task organisation'; END IF;
  IF NEW.case_id IS NOT NULL THEN
    SELECT organization_id,is_sensitive INTO co,cs FROM public.beneficiary_cases WHERE id=NEW.case_id AND deleted_at IS NULL;
    IF co IS DISTINCT FROM NEW.organization_id THEN RAISE EXCEPTION 'Linked case must belong to the same organisation'; END IF;
    NEW.is_sensitive:=NEW.is_sensitive OR COALESCE(cs,false);
    IF auth.role()<>'service_role' AND NOT app_private.case_is_visible_scoped(auth.uid(),NEW.case_id,NEW.organization_id) THEN RAISE EXCEPTION 'Linked case is outside your access scope'; END IF;
  END IF;
  IF NEW.related_record_id IS NOT NULL AND NOT app_private.work_management_source_org(NEW.related_record_type,NEW.related_record_id,NEW.organization_id) THEN RAISE EXCEPTION 'Linked record must exist in this organisation'; END IF;
  IF NEW.source_record_id IS NOT NULL AND NOT app_private.work_management_source_org(NEW.source_record_type,NEW.source_record_id,NEW.organization_id) THEN RAISE EXCEPTION 'Task source must exist in this organisation'; END IF;
  IF auth.role()<>'service_role' AND NOT public.user_is_org_elevated(auth.uid(),NEW.organization_id) THEN
    IF public.user_is_field_scoped(auth.uid(),NEW.organization_id) THEN
      IF NEW.program_id IS NOT NULL AND NEW.program_id NOT IN (SELECT public.user_assigned_program_ids(auth.uid(),NEW.organization_id)) THEN RAISE EXCEPTION 'Task programme is outside your assigned scope'; END IF;
      IF NEW.project_id IS NOT NULL AND NEW.project_id NOT IN (SELECT public.user_assigned_project_ids(auth.uid(),NEW.organization_id)) THEN RAISE EXCEPTION 'Task project is outside your assigned scope'; END IF;
    ELSIF public.user_is_program_scoped(auth.uid(),NEW.organization_id) THEN
      scoped_ok:=((NEW.program_id IS NULL AND NEW.project_id IS NULL AND NEW.case_id IS NULL) OR NEW.program_id IN (SELECT public.user_assigned_program_ids(auth.uid(),NEW.organization_id)) OR NEW.project_id IN (SELECT public.user_assigned_project_ids(auth.uid(),NEW.organization_id)) OR (NEW.case_id IS NOT NULL AND app_private.case_is_visible_scoped(auth.uid(),NEW.case_id,NEW.organization_id)));
    ELSIF app_private.user_is_project_scoped(auth.uid(),NEW.organization_id) THEN
      scoped_ok:=((NEW.program_id IS NULL AND NEW.project_id IS NULL AND NEW.case_id IS NULL) OR NEW.project_id IN (SELECT public.user_assigned_project_ids(auth.uid(),NEW.organization_id)) OR (NEW.case_id IS NOT NULL AND app_private.case_is_visible_scoped(auth.uid(),NEW.case_id,NEW.organization_id)));
    END IF;
    IF NOT scoped_ok THEN RAISE EXCEPTION 'Task is outside your assigned scope'; END IF;
  END IF;
  IF NEW.related_record_id IS NOT NULL THEN
    CASE NEW.related_record_type
      WHEN 'life_event' THEN
        SELECT beneficiary_id,is_sensitive INTO source_beneficiary,rs FROM public.life_events WHERE id=NEW.related_record_id AND organization_id=NEW.organization_id;
        IF rs AND NOT public.can_view_sensitive_life_events(NEW.organization_id) THEN RAISE EXCEPTION 'Sensitive source record is not accessible'; END IF;
      WHEN 'vulnerability_assessment' THEN
        SELECT beneficiary_id,household_id,assessment_id,sensitivity INTO source_beneficiary,source_household,source_assessment,source_sensitivity FROM public.vulnerability_assessments WHERE id=NEW.related_record_id AND organization_id=NEW.organization_id AND deleted_at IS NULL;
        IF NOT public.can_read_vulnerability_history(NEW.organization_id,source_assessment) THEN RAISE EXCEPTION 'Assessment source record is not accessible'; END IF;
        rs:=source_sensitivity<>'standard';
        IF source_household IS NOT NULL AND NOT public.household_visible_scoped(auth.uid(),source_household,NEW.organization_id) THEN RAISE EXCEPTION 'Assessment source is outside your access scope'; END IF;
      WHEN 'need' THEN SELECT beneficiary_id INTO source_beneficiary FROM public.beneficiary_needs WHERE id=NEW.related_record_id AND organization_id=NEW.organization_id;
      WHEN 'home_visit' THEN SELECT beneficiary_id INTO source_beneficiary FROM public.home_visits WHERE id=NEW.related_record_id AND organization_id=NEW.organization_id AND deleted_at IS NULL;
      WHEN 'school_visit' THEN SELECT beneficiary_id INTO source_beneficiary FROM public.school_visits WHERE id=NEW.related_record_id AND organization_id=NEW.organization_id AND deleted_at IS NULL;
      WHEN 'donor_request' THEN NULL;
    END CASE;
    IF source_beneficiary IS NOT NULL AND NOT public.beneficiary_visible_scoped(auth.uid(),source_beneficiary,NEW.organization_id) THEN RAISE EXCEPTION 'Linked source record is outside your access scope'; END IF;
    NEW.is_sensitive:=NEW.is_sensitive OR COALESCE(rs,false);
  END IF;
  IF NEW.source_record_id IS NOT NULL THEN
    CASE NEW.source_record_type
      WHEN 'life_event' THEN
        SELECT beneficiary_id,is_sensitive INTO source_beneficiary,ss FROM public.life_events WHERE id=NEW.source_record_id AND organization_id=NEW.organization_id;
        IF ss AND auth.role()<>'service_role' AND NOT public.can_view_sensitive_life_events(NEW.organization_id) THEN RAISE EXCEPTION 'Sensitive source record is not accessible'; END IF;
      WHEN 'vulnerability_assessment' THEN
        SELECT beneficiary_id,household_id,assessment_id,sensitivity INTO source_beneficiary,source_household,source_assessment,source_sensitivity FROM public.vulnerability_assessments WHERE id=NEW.source_record_id AND organization_id=NEW.organization_id AND deleted_at IS NULL;
        IF auth.role()<>'service_role' AND NOT public.can_read_vulnerability_history(NEW.organization_id,source_assessment) THEN RAISE EXCEPTION 'Assessment source record is not accessible'; END IF;
        ss:=source_sensitivity<>'standard';
        IF source_household IS NOT NULL AND NOT public.household_visible_scoped(auth.uid(),source_household,NEW.organization_id) THEN RAISE EXCEPTION 'Assessment source is outside your access scope'; END IF;
      WHEN 'need' THEN SELECT beneficiary_id INTO source_beneficiary FROM public.beneficiary_needs WHERE id=NEW.source_record_id AND organization_id=NEW.organization_id;
      WHEN 'home_visit' THEN SELECT beneficiary_id INTO source_beneficiary FROM public.home_visits WHERE id=NEW.source_record_id AND organization_id=NEW.organization_id AND deleted_at IS NULL;
      WHEN 'school_visit' THEN SELECT beneficiary_id INTO source_beneficiary FROM public.school_visits WHERE id=NEW.source_record_id AND organization_id=NEW.organization_id AND deleted_at IS NULL;
      WHEN 'donor_request' THEN NULL;
    END CASE;
    IF auth.role()<>'service_role' AND source_beneficiary IS NOT NULL AND NOT public.beneficiary_visible_scoped(auth.uid(),source_beneficiary,NEW.organization_id) THEN RAISE EXCEPTION 'Task source is outside your access scope'; END IF;
    NEW.is_sensitive:=NEW.is_sensitive OR COALESCE(ss,false);
  END IF;
  IF NEW.is_sensitive AND auth.role()<>'service_role' AND NOT (public.user_is_org_elevated(auth.uid(),NEW.organization_id) OR public.user_has_permission(auth.uid(),NEW.organization_id,'cases','view','sensitive')) THEN RAISE EXCEPTION 'Sensitive work permission required'; END IF;
  IF NEW.status='completed' THEN NEW.completed_at:=COALESCE(NEW.completed_at,now()); ELSE NEW.completed_at:=NULL; END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION app_private.user_is_project_scoped(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION app_private.user_is_project_scoped(uuid,uuid) TO authenticated,service_role;
NOTIFY pgrst, 'reload schema';