ALTER TABLE public.staff_tasks
  ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.beneficiary_cases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_record_type text,
  ADD COLUMN IF NOT EXISTS related_record_id uuid,
  ADD COLUMN IF NOT EXISTS source_event_type text,
  ADD COLUMN IF NOT EXISTS source_record_type text,
  ADD COLUMN IF NOT EXISTS source_record_id uuid,
  ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false;
ALTER TABLE public.beneficiary_cases ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='staff_tasks_related_record_pair') THEN
    ALTER TABLE public.staff_tasks ADD CONSTRAINT staff_tasks_related_record_pair CHECK ((related_record_type IS NULL) = (related_record_id IS NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='staff_tasks_source_record_pair') THEN
    ALTER TABLE public.staff_tasks ADD CONSTRAINT staff_tasks_source_record_pair CHECK ((source_event_type IS NULL AND source_record_type IS NULL AND source_record_id IS NULL) OR (NULLIF(btrim(source_event_type),'') IS NOT NULL AND source_record_type IS NOT NULL AND source_record_id IS NOT NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='staff_tasks_related_record_type_allowed') THEN
    ALTER TABLE public.staff_tasks ADD CONSTRAINT staff_tasks_related_record_type_allowed CHECK (related_record_type IS NULL OR related_record_type IN ('life_event','vulnerability_assessment','need','home_visit','school_visit','donor_request'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='staff_tasks_source_record_type_allowed') THEN
    ALTER TABLE public.staff_tasks ADD CONSTRAINT staff_tasks_source_record_type_allowed CHECK (source_record_type IS NULL OR source_record_type IN ('life_event','vulnerability_assessment','need','home_visit','school_visit','donor_request'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS staff_tasks_source_idempotency_idx ON public.staff_tasks(organization_id, source_event_type, source_record_id) WHERE source_event_type IS NOT NULL AND source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS staff_tasks_case_id_idx ON public.staff_tasks(organization_id, case_id) WHERE case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS staff_tasks_assignee_open_due_idx ON public.staff_tasks(organization_id, assigned_to, due_date) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX IF NOT EXISTS beneficiary_cases_assignee_idx ON public.beneficiary_cases(organization_id, assigned_to, case_status) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.user_is_donor_for_org(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.donor_accounts da WHERE da.user_id=_user_id AND da.organization_id=_org_id AND da.is_active=true)
$$;

CREATE OR REPLACE FUNCTION public.case_is_visible_scoped(_user_id uuid, _case_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.beneficiary_cases c
    WHERE c.id=_case_id AND c.organization_id=_org_id AND c.deleted_at IS NULL
      AND public.user_belongs_to_org(_user_id,_org_id)
      AND NOT public.user_is_donor_for_org(_user_id,_org_id)
      AND (NOT c.is_sensitive OR public.user_is_org_elevated(_user_id,_org_id) OR public.user_has_permission(_user_id,_org_id,'cases','view','sensitive'))
      AND (
        public.user_is_org_elevated(_user_id,_org_id)
        OR (NOT public.user_is_field_scoped(_user_id,_org_id) AND NOT public.user_is_program_scoped(_user_id,_org_id))
        OR (public.user_is_program_scoped(_user_id,_org_id) AND c.program_id IN (SELECT public.user_assigned_program_ids(_user_id,_org_id)))
        OR (public.user_is_field_scoped(_user_id,_org_id) AND (
          c.assigned_to=_user_id OR c.created_by=_user_id OR public.beneficiary_visible_scoped(_user_id,c.beneficiary_id,_org_id)
        ))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.staff_task_is_visible_scoped(_user_id uuid, _task_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_tasks t
    WHERE t.id=_task_id AND t.organization_id=_org_id
      AND public.user_belongs_to_org(_user_id,_org_id)
      AND NOT public.user_is_donor_for_org(_user_id,_org_id)
      AND (NOT t.is_sensitive OR public.user_is_org_elevated(_user_id,_org_id) OR public.user_has_permission(_user_id,_org_id,'cases','view','sensitive'))
      AND (t.case_id IS NULL OR public.case_is_visible_scoped(_user_id,t.case_id,_org_id))
      AND (
        public.user_is_org_elevated(_user_id,_org_id)
        OR (NOT public.user_is_field_scoped(_user_id,_org_id) AND NOT public.user_is_program_scoped(_user_id,_org_id))
        OR (public.user_is_program_scoped(_user_id,_org_id) AND (
          t.program_id IN (SELECT public.user_assigned_program_ids(_user_id,_org_id))
          OR EXISTS (SELECT 1 FROM public.beneficiary_cases c WHERE c.id=t.case_id AND c.program_id IN (SELECT public.user_assigned_program_ids(_user_id,_org_id)))
        ))
        OR (public.user_is_field_scoped(_user_id,_org_id) AND (
          t.assigned_to=_user_id OR t.assigned_by=_user_id OR (t.case_id IS NOT NULL AND public.case_is_visible_scoped(_user_id,t.case_id,_org_id))
        ))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.work_management_source_org(_record_type text, _record_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _found boolean := false;
BEGIN
  CASE _record_type
    WHEN 'life_event' THEN SELECT EXISTS(SELECT 1 FROM public.life_events WHERE id=_record_id AND organization_id=_org_id AND deleted_at IS NULL) INTO _found;
    WHEN 'vulnerability_assessment' THEN SELECT EXISTS(SELECT 1 FROM public.vulnerability_assessments WHERE id=_record_id AND organization_id=_org_id) INTO _found;
    WHEN 'need' THEN SELECT EXISTS(SELECT 1 FROM public.beneficiary_needs WHERE id=_record_id AND organization_id=_org_id) INTO _found;
    WHEN 'home_visit' THEN SELECT EXISTS(SELECT 1 FROM public.home_visits WHERE id=_record_id AND organization_id=_org_id AND deleted_at IS NULL) INTO _found;
    WHEN 'school_visit' THEN SELECT EXISTS(SELECT 1 FROM public.school_visits WHERE id=_record_id AND organization_id=_org_id AND deleted_at IS NULL) INTO _found;
    WHEN 'donor_request' THEN SELECT EXISTS(SELECT 1 FROM public.donation_intents WHERE id=_record_id AND organization_id=_org_id) INTO _found;
    ELSE RAISE EXCEPTION 'Unsupported task source type';
  END CASE;
  RETURN _found;
END $$;

CREATE OR REPLACE FUNCTION public.validate_staff_task_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _case_org uuid; _case_sensitive boolean; _source_sensitive boolean := false; _can_manage boolean;
BEGIN
  _can_manage := auth.role()='service_role' OR public.user_is_org_elevated(auth.uid(),NEW.organization_id) OR public.user_has_permission(auth.uid(),NEW.organization_id,'tasks','manage','tasks');
  IF TG_OP='UPDATE' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'Task organisation cannot change'; END IF;
    IF (NEW.source_event_type,NEW.source_record_type,NEW.source_record_id) IS DISTINCT FROM (OLD.source_event_type,OLD.source_record_type,OLD.source_record_id) THEN RAISE EXCEPTION 'Task source key is immutable'; END IF;
    IF NOT _can_manage AND OLD.assigned_to=auth.uid() THEN
      IF (to_jsonb(NEW)-ARRAY['status','completed_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','completed_at','updated_at']) THEN RAISE EXCEPTION 'Assigned staff may only progress their task'; END IF;
    ELSIF NOT _can_manage THEN RAISE EXCEPTION 'Not authorised to edit this task'; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status='todo' AND NEW.status IN ('in_progress','cancelled')) OR
      (OLD.status='in_progress' AND NEW.status IN ('todo','blocked','completed','cancelled')) OR
      (OLD.status='blocked' AND NEW.status IN ('in_progress','cancelled'))
    ) THEN RAISE EXCEPTION 'Invalid task status transition: % to %',OLD.status,NEW.status; END IF;
  ELSE
    IF auth.role()<>'service_role' AND NOT (public.user_is_org_elevated(auth.uid(),NEW.organization_id) OR public.user_has_permission(auth.uid(),NEW.organization_id,'tasks','manage','tasks')) THEN RAISE EXCEPTION 'Task management permission required'; END IF;
  END IF;
  IF NEW.assigned_to IS NOT NULL AND NOT public.user_belongs_to_org(NEW.assigned_to,NEW.organization_id) THEN RAISE EXCEPTION 'Assignee must belong to the task organisation'; END IF;
  IF NEW.case_id IS NOT NULL THEN
    SELECT organization_id,is_sensitive INTO _case_org,_case_sensitive FROM public.beneficiary_cases WHERE id=NEW.case_id AND deleted_at IS NULL;
    IF _case_org IS DISTINCT FROM NEW.organization_id THEN RAISE EXCEPTION 'Linked case must belong to the same organisation'; END IF;
    IF _case_sensitive THEN NEW.is_sensitive := true; END IF;
    IF auth.role()<>'service_role' AND NOT public.case_is_visible_scoped(auth.uid(),NEW.case_id,NEW.organization_id) THEN RAISE EXCEPTION 'Linked case is outside your access scope'; END IF;
  END IF;
  IF NEW.related_record_id IS NOT NULL AND NOT public.work_management_source_org(NEW.related_record_type,NEW.related_record_id,NEW.organization_id) THEN RAISE EXCEPTION 'Linked record must exist in the same organisation'; END IF;
  IF NEW.source_record_id IS NOT NULL AND NOT public.work_management_source_org(NEW.source_record_type,NEW.source_record_id,NEW.organization_id) THEN RAISE EXCEPTION 'Task source must exist in the same organisation'; END IF;
  IF NEW.source_record_type='life_event' AND NEW.source_record_id IS NOT NULL THEN
    SELECT is_sensitive INTO _source_sensitive FROM public.life_events WHERE id=NEW.source_record_id AND organization_id=NEW.organization_id;
  ELSIF NEW.source_record_type='vulnerability_assessment' AND NEW.source_record_id IS NOT NULL THEN
    SELECT sensitivity<>'standard' INTO _source_sensitive FROM public.vulnerability_assessments WHERE id=NEW.source_record_id AND organization_id=NEW.organization_id;
  END IF;
  IF _source_sensitive THEN NEW.is_sensitive := true; END IF;
  IF NEW.status='completed' THEN NEW.completed_at:=COALESCE(NEW.completed_at,now()); ELSE NEW.completed_at:=NULL; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_staff_task_write ON public.staff_tasks;
CREATE TRIGGER validate_staff_task_write BEFORE INSERT OR UPDATE ON public.staff_tasks FOR EACH ROW EXECUTE FUNCTION public.validate_staff_task_write();

CREATE OR REPLACE FUNCTION public.validate_beneficiary_case_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _can_manage boolean;
BEGIN
  _can_manage := auth.role()='service_role' OR public.user_is_org_elevated(auth.uid(),NEW.organization_id) OR public.user_has_permission(auth.uid(),NEW.organization_id,'cases','manage','cases');
  IF TG_OP='INSERT' THEN
    IF auth.role()<>'service_role' AND NOT (public.user_is_org_elevated(auth.uid(),NEW.organization_id) OR public.user_has_permission(auth.uid(),NEW.organization_id,'cases','manage','cases')) THEN RAISE EXCEPTION 'Case management permission required'; END IF;
  ELSE
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.beneficiary_id IS DISTINCT FROM OLD.beneficiary_id THEN RAISE EXCEPTION 'Case organisation and beneficiary cannot change'; END IF;
    IF NOT _can_manage AND OLD.assigned_to=auth.uid() THEN
      IF (to_jsonb(NEW)-ARRAY['case_status','closed_date','closure_reason','updated_by','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['case_status','closed_date','closure_reason','updated_by','updated_at']) THEN RAISE EXCEPTION 'Assigned staff may only progress or close their case'; END IF;
    ELSIF NOT _can_manage THEN RAISE EXCEPTION 'Not authorised to edit this case'; END IF;
    IF NEW.case_status IS DISTINCT FROM OLD.case_status AND NOT (
      (OLD.case_status='open' AND NEW.case_status IN ('in_progress','referred','resolved','closed','lost_to_follow_up')) OR
      (OLD.case_status='in_progress' AND NEW.case_status IN ('open','referred','resolved','closed','lost_to_follow_up')) OR
      (OLD.case_status='referred' AND NEW.case_status IN ('in_progress','resolved','closed','lost_to_follow_up')) OR
      (OLD.case_status='resolved' AND NEW.case_status IN ('in_progress','closed'))
    ) THEN RAISE EXCEPTION 'Invalid case status transition: % to %',OLD.case_status,NEW.case_status; END IF;
  END IF;
  IF NEW.assigned_to IS NOT NULL AND NOT public.user_belongs_to_org(NEW.assigned_to,NEW.organization_id) THEN RAISE EXCEPTION 'Case assignee must belong to the case organisation'; END IF;
  IF NEW.case_status IN ('resolved','closed','lost_to_follow_up') THEN
    IF NULLIF(btrim(NEW.closure_reason),'') IS NULL THEN RAISE EXCEPTION 'A reason is required to close or resolve a case'; END IF;
    NEW.closed_date:=COALESCE(NEW.closed_date,CURRENT_DATE);
  END IF;
  IF NEW.is_sensitive AND auth.role()<>'service_role' AND NOT (public.user_is_org_elevated(auth.uid(),NEW.organization_id) OR public.user_has_permission(auth.uid(),NEW.organization_id,'cases','view','sensitive')) THEN RAISE EXCEPTION 'Sensitive case permission required'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_beneficiary_case_write ON public.beneficiary_cases;
CREATE TRIGGER validate_beneficiary_case_write BEFORE INSERT OR UPDATE ON public.beneficiary_cases FOR EACH ROW EXECUTE FUNCTION public.validate_beneficiary_case_write();

CREATE OR REPLACE FUNCTION public.validate_case_entry_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _case_org uuid; _beneficiary uuid;
BEGIN
  SELECT organization_id,beneficiary_id INTO _case_org,_beneficiary FROM public.beneficiary_cases WHERE id=NEW.case_id AND deleted_at IS NULL;
  IF _case_org IS DISTINCT FROM NEW.organization_id OR _beneficiary IS DISTINCT FROM NEW.beneficiary_id THEN RAISE EXCEPTION 'Entry must match its case organisation and beneficiary'; END IF;
  IF auth.role()<>'service_role' AND NOT public.case_is_visible_scoped(auth.uid(),NEW.case_id,NEW.organization_id) THEN RAISE EXCEPTION 'Case is outside your access scope'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_case_entry_access ON public.case_entries;
CREATE TRIGGER validate_case_entry_access BEFORE INSERT OR UPDATE ON public.case_entries FOR EACH ROW EXECUTE FUNCTION public.validate_case_entry_access();

CREATE OR REPLACE FUNCTION public.audit_work_management_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _type text; _id uuid; _org uuid; _event text; _old jsonb; _new jsonb;
BEGIN
  _type:=CASE WHEN TG_TABLE_NAME='staff_tasks' THEN 'staff_task' ELSE 'beneficiary_case' END;
  IF TG_OP='DELETE' THEN _id:=OLD.id; _org:=OLD.organization_id; _old:=jsonb_build_object('status',CASE WHEN TG_TABLE_NAME='staff_tasks' THEN OLD.status ELSE OLD.case_status END,'assigned_to',OLD.assigned_to,'priority',OLD.priority); _event:=_type||'_deleted';
  ELSE _id:=NEW.id; _org:=NEW.organization_id;
    IF TG_OP='UPDATE' THEN _old:=jsonb_build_object('status',CASE WHEN TG_TABLE_NAME='staff_tasks' THEN OLD.status ELSE OLD.case_status END,'assigned_to',OLD.assigned_to,'priority',OLD.priority); END IF;
    _new:=jsonb_build_object('status',CASE WHEN TG_TABLE_NAME='staff_tasks' THEN NEW.status ELSE NEW.case_status END,'assigned_to',NEW.assigned_to,'priority',NEW.priority);
    IF TG_OP='INSERT' THEN _event:=_type||'_created'; ELSE _event:=_type||'_updated'; END IF;
  END IF;
  INSERT INTO public.audit_logs(event_type,entity_type,entity_id,user_id,old_values,new_values,metadata)
  VALUES (_event,_type,_id,auth.uid(),_old,_new,jsonb_build_object('organization_id',_org,'case_id',CASE WHEN TG_TABLE_NAME='staff_tasks' THEN NEW.case_id ELSE NULL END,'source_event_type',CASE WHEN TG_TABLE_NAME='staff_tasks' THEN NEW.source_event_type ELSE NULL END));
  RETURN COALESCE(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS audit_staff_tasks_changes ON public.staff_tasks;
CREATE TRIGGER audit_staff_tasks_changes AFTER INSERT OR UPDATE ON public.staff_tasks FOR EACH ROW EXECUTE FUNCTION public.audit_work_management_change();
DROP TRIGGER IF EXISTS audit_beneficiary_cases_changes ON public.beneficiary_cases;
CREATE TRIGGER audit_beneficiary_cases_changes AFTER INSERT OR UPDATE ON public.beneficiary_cases FOR EACH ROW EXECUTE FUNCTION public.audit_work_management_change();

CREATE OR REPLACE FUNCTION public.notify_work_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _assignee uuid; _org uuid; _id uuid; _kind text; _title text;
BEGIN
  IF TG_TABLE_NAME='staff_tasks' THEN _assignee:=NEW.assigned_to; _org:=NEW.organization_id; _id:=NEW.id; _kind:='task'; _title:='A task was assigned to you';
  ELSE _assignee:=NEW.assigned_to; _org:=NEW.organization_id; _id:=NEW.id; _kind:='case'; _title:='A case was assigned to you'; END IF;
  IF _assignee IS NOT NULL AND (TG_OP='INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) AND _assignee IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notifications(organization_id,user_id,title,message,category,severity,related_entity_type,related_entity_id,metadata)
    VALUES(_org,_assignee,_title,'Please review your assigned work.','work_management','info',_kind,_id,jsonb_build_object('organization_id',_org));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_task_assignee ON public.staff_tasks;
CREATE TRIGGER notify_task_assignee AFTER INSERT OR UPDATE OF assigned_to ON public.staff_tasks FOR EACH ROW EXECUTE FUNCTION public.notify_work_assignment();
DROP TRIGGER IF EXISTS notify_case_assignee ON public.beneficiary_cases;
CREATE TRIGGER notify_case_assignee AFTER INSERT OR UPDATE OF assigned_to ON public.beneficiary_cases FOR EACH ROW EXECUTE FUNCTION public.notify_work_assignment();

CREATE OR REPLACE FUNCTION public.create_or_get_source_task(
  _org_id uuid,_event_type text,_source_record_type text,_source_record_id uuid,_title text,
  _description text DEFAULT NULL,_assigned_to uuid DEFAULT NULL,_priority text DEFAULT 'medium',
  _due_date date DEFAULT NULL,_program_id uuid DEFAULT NULL,_project_id uuid DEFAULT NULL,
  _case_id uuid DEFAULT NULL,_is_sensitive boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid; _sensitive boolean:=COALESCE(_is_sensitive,false); _life_sensitive boolean; _assessment_sensitivity text;
BEGIN
  IF NULLIF(btrim(_event_type),'') IS NULL OR _source_record_id IS NULL OR NULLIF(btrim(_title),'') IS NULL THEN RAISE EXCEPTION 'Event type, source record and task title are required'; END IF;
  IF auth.role()<>'service_role' AND (NOT public.user_belongs_to_org(auth.uid(),_org_id) OR public.user_is_donor_for_org(auth.uid(),_org_id) OR NOT (public.user_is_org_elevated(auth.uid(),_org_id) OR public.user_has_permission(auth.uid(),_org_id,'tasks','manage','tasks'))) THEN RAISE EXCEPTION 'Task management permission required'; END IF;
  IF NOT public.work_management_source_org(_source_record_type,_source_record_id,_org_id) THEN RAISE EXCEPTION 'Source record not found in this organisation'; END IF;
  IF _source_record_type='life_event' THEN SELECT is_sensitive INTO _life_sensitive FROM public.life_events WHERE id=_source_record_id AND organization_id=_org_id; _sensitive:=_sensitive OR COALESCE(_life_sensitive,false);
  ELSIF _source_record_type='vulnerability_assessment' THEN SELECT sensitivity INTO _assessment_sensitivity FROM public.vulnerability_assessments WHERE id=_source_record_id AND organization_id=_org_id; _sensitive:=_sensitive OR COALESCE(_assessment_sensitivity,'standard')<>'standard'; END IF;
  IF _sensitive AND auth.role()<>'service_role' AND NOT (public.user_is_org_elevated(auth.uid(),_org_id) OR public.user_has_permission(auth.uid(),_org_id,'cases','view','sensitive')) THEN RAISE EXCEPTION 'Sensitive work permission required'; END IF;
  INSERT INTO public.staff_tasks(organization_id,title,description,assigned_to,assigned_by,priority,due_date,program_id,project_id,case_id,related_record_type,related_record_id,source_event_type,source_record_type,source_record_id,is_sensitive)
  VALUES(_org_id,_title,_description,_assigned_to,auth.uid(),_priority,_due_date,_program_id,_project_id,_case_id,_source_record_type,_source_record_id,_event_type,_source_record_type,_source_record_id,_sensitive)
  ON CONFLICT(organization_id,source_event_type,source_record_id) WHERE source_event_type IS NOT NULL AND source_record_id IS NOT NULL DO NOTHING;
  SELECT id INTO _id FROM public.staff_tasks WHERE organization_id=_org_id AND source_event_type=_event_type AND source_record_id=_source_record_id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.get_staff_task_workload(_org_id uuid)
RETURNS TABLE(staff_user_id uuid,open_tasks bigint,overdue_tasks bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.user_belongs_to_org(auth.uid(),_org_id) OR public.user_is_donor_for_org(auth.uid(),_org_id) THEN RAISE EXCEPTION 'Not authorised for this organisation'; END IF;
  IF NOT (public.user_is_org_elevated(auth.uid(),_org_id) OR public.user_has_permission(auth.uid(),_org_id,'tasks','manage','tasks') OR public.user_has_permission(auth.uid(),_org_id,'hr','view','staff')) THEN
    RETURN QUERY SELECT t.assigned_to,count(*) FILTER(WHERE t.status NOT IN ('completed','cancelled'))::bigint,count(*) FILTER(WHERE t.status NOT IN ('completed','cancelled') AND t.due_date<CURRENT_DATE)::bigint FROM public.staff_tasks t WHERE t.organization_id=_org_id AND t.assigned_to=auth.uid() GROUP BY t.assigned_to;
  ELSE
    RETURN QUERY SELECT t.assigned_to,count(*) FILTER(WHERE t.status NOT IN ('completed','cancelled'))::bigint,count(*) FILTER(WHERE t.status NOT IN ('completed','cancelled') AND t.due_date<CURRENT_DATE)::bigint FROM public.staff_tasks t WHERE t.organization_id=_org_id AND t.assigned_to IS NOT NULL AND public.staff_task_is_visible_scoped(auth.uid(),t.id,_org_id) GROUP BY t.assigned_to;
  END IF;
END $$;

INSERT INTO public.rbac_permissions(module,module_display_name,action,resource,display_name,description,sort_order)
VALUES
 ('tasks','Tasks','view','tasks','View Tasks','View tasks within assigned organisation and programme scope',810),
 ('tasks','Tasks','manage','tasks','Manage Tasks','Create, assign, update and link tasks',811),
 ('cases','Cases','view','cases','View Cases','View cases within assigned organisation and programme scope',820),
 ('cases','Cases','manage','cases','Manage Cases','Open, assign, update and close cases',821),
 ('cases','Cases','view','sensitive','View Sensitive Cases','Additional access to sensitive cases and linked tasks',822)
ON CONFLICT(module,action,resource) DO NOTHING;
INSERT INTO public.rbac_role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM public.rbac_roles r CROSS JOIN public.rbac_permissions p
WHERE r.is_system_role=true AND (
  (p.module='tasks' AND p.action='view' AND r.name IN ('org_admin','program_manager','project_manager','field_officer','data_entry','staff_member','me_officer','readonly_viewer','viewer')) OR
  (p.module='tasks' AND p.action='manage' AND r.name IN ('org_admin','program_manager','project_manager','field_officer','data_entry','staff_member','me_officer')) OR
  (p.module='cases' AND p.action='view' AND p.resource='cases' AND r.name IN ('org_admin','program_manager','project_manager','field_officer','data_entry','staff_member','me_officer','readonly_viewer','viewer')) OR
  (p.module='cases' AND p.action='manage' AND r.name IN ('org_admin','program_manager','project_manager','field_officer','data_entry','staff_member','me_officer')) OR
  (p.module='cases' AND p.action='view' AND p.resource='sensitive' AND r.name IN ('org_admin'))
) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Users can view tasks in their org" ON public.staff_tasks;
DROP POLICY IF EXISTS "Users can create tasks in their org" ON public.staff_tasks;
DROP POLICY IF EXISTS "Users can update tasks in their org" ON public.staff_tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their org" ON public.staff_tasks;
CREATE POLICY staff_tasks_scoped_select ON public.staff_tasks FOR SELECT TO authenticated USING (public.staff_task_is_visible_scoped(auth.uid(),id,organization_id) AND (public.user_has_permission(auth.uid(),organization_id,'tasks','view','tasks') OR public.user_has_permission(auth.uid(),organization_id,'tasks','manage','tasks') OR assigned_to=auth.uid()));
CREATE POLICY staff_tasks_scoped_insert ON public.staff_tasks FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(),organization_id) AND NOT public.user_is_donor_for_org(auth.uid(),organization_id) AND (public.user_is_org_elevated(auth.uid(),organization_id) OR public.user_has_permission(auth.uid(),organization_id,'tasks','manage','tasks')));
CREATE POLICY staff_tasks_scoped_update ON public.staff_tasks FOR UPDATE TO authenticated USING (public.staff_task_is_visible_scoped(auth.uid(),id,organization_id) AND (public.user_is_org_elevated(auth.uid(),organization_id) OR public.user_has_permission(auth.uid(),organization_id,'tasks','manage','tasks') OR assigned_to=auth.uid())) WITH CHECK (public.staff_task_is_visible_scoped(auth.uid(),id,organization_id) AND (public.user_is_org_elevated(auth.uid(),organization_id) OR public.user_has_permission(auth.uid(),organization_id,'tasks','manage','tasks') OR assigned_to=auth.uid()));

DROP POLICY IF EXISTS beneficiary_cases_select ON public.beneficiary_cases;
DROP POLICY IF EXISTS beneficiary_cases_insert ON public.beneficiary_cases;
DROP POLICY IF EXISTS beneficiary_cases_update ON public.beneficiary_cases;
CREATE POLICY beneficiary_cases_scoped_select ON public.beneficiary_cases FOR SELECT TO authenticated USING (public.case_is_visible_scoped(auth.uid(),id,organization_id) AND public.user_has_permission(auth.uid(),organization_id,'cases','view','cases'));
CREATE POLICY beneficiary_cases_scoped_insert ON public.beneficiary_cases FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(),organization_id) AND NOT public.user_is_donor_for_org(auth.uid(),organization_id) AND (public.user_is_org_elevated(auth.uid(),organization_id) OR public.user_has_permission(auth.uid(),organization_id,'cases','manage','cases')) AND (NOT is_sensitive OR public.user_is_org_elevated(auth.uid(),organization_id) OR public.user_has_permission(auth.uid(),organization_id,'cases','view','sensitive')));
CREATE POLICY beneficiary_cases_scoped_update ON public.beneficiary_cases FOR UPDATE TO authenticated USING (public.case_is_visible_scoped(auth.uid(),id,organization_id) AND (public.user_is_org_elevated(auth.uid(),organization_id) OR public.user_has_permission(auth.uid(),organization_id,'cases','manage','cases') OR assigned_to=auth.uid())) WITH CHECK (public.case_is_visible_scoped(auth.uid(),id,organization_id) AND (public.user_is_org_elevated(auth.uid(),organization_id) OR public.user_has_permission(auth.uid(),organization_id,'cases','manage','cases') OR assigned_to=auth.uid()));

DROP POLICY IF EXISTS case_entries_select ON public.case_entries;
DROP POLICY IF EXISTS case_entries_insert ON public.case_entries;
DROP POLICY IF EXISTS case_entries_update ON public.case_entries;
DROP POLICY IF EXISTS "org members select case_entries" ON public.case_entries;
DROP POLICY IF EXISTS "org members insert case_entries" ON public.case_entries;
DROP POLICY IF EXISTS "org members update case_entries" ON public.case_entries;
CREATE POLICY case_entries_scoped_select ON public.case_entries FOR SELECT TO authenticated USING (public.case_is_visible_scoped(auth.uid(),case_id,organization_id) AND public.user_has_permission(auth.uid(),organization_id,'cases','view','cases'));
CREATE POLICY case_entries_scoped_insert ON public.case_entries FOR INSERT TO authenticated WITH CHECK (public.case_is_visible_scoped(auth.uid(),case_id,organization_id) AND (public.user_is_org_elevated(auth.uid(),organization_id) OR public.user_has_permission(auth.uid(),organization_id,'cases','manage','cases') OR EXISTS (SELECT 1 FROM public.beneficiary_cases c WHERE c.id=case_id AND c.assigned_to=auth.uid())));
CREATE POLICY case_entries_scoped_update ON public.case_entries FOR UPDATE TO authenticated USING (public.case_is_visible_scoped(auth.uid(),case_id,organization_id) AND (public.user_is_org_elevated(auth.uid(),organization_id) OR public.user_has_permission(auth.uid(),organization_id,'cases','manage','cases') OR EXISTS (SELECT 1 FROM public.beneficiary_cases c WHERE c.id=case_id AND c.assigned_to=auth.uid()))) WITH CHECK (public.case_is_visible_scoped(auth.uid(),case_id,organization_id));

REVOKE ALL ON FUNCTION public.user_is_donor_for_org(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.case_is_visible_scoped(uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.staff_task_is_visible_scoped(uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.work_management_source_org(text,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.validate_staff_task_write() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.validate_beneficiary_case_write() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.validate_case_entry_access() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.audit_work_management_change() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.notify_work_assignment() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_or_get_source_task(uuid,text,text,uuid,text,text,uuid,text,date,uuid,uuid,uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_staff_task_workload(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.user_is_donor_for_org(uuid,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.case_is_visible_scoped(uuid,uuid,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.staff_task_is_visible_scoped(uuid,uuid,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.create_or_get_source_task(uuid,text,text,uuid,text,text,uuid,text,date,uuid,uuid,uuid,boolean) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_staff_task_workload(uuid) TO authenticated,service_role;
NOTIFY pgrst, 'reload schema';