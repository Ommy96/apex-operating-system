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
        OR (NOT public.user_is_field_scoped(_user_id,_org_id) AND NOT public.user_is_program_scoped(_user_id,_org_id))
        OR (public.user_is_program_scoped(_user_id,_org_id) AND (
          c.assigned_to=_user_id OR c.created_by=_user_id
          OR c.program_id IN (SELECT public.user_assigned_program_ids(_user_id,_org_id))
          OR EXISTS (SELECT 1 FROM public.beneficiary_services bs WHERE bs.organization_id=_org_id AND bs.beneficiary_id=c.beneficiary_id AND bs.program_id IN (SELECT public.user_assigned_program_ids(_user_id,_org_id)))
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
        OR (NOT public.user_is_field_scoped(_user_id,_org_id) AND NOT public.user_is_program_scoped(_user_id,_org_id))
        OR (public.user_is_program_scoped(_user_id,_org_id) AND (
          t.assigned_to=_user_id OR t.assigned_by=_user_id
          OR t.program_id IN (SELECT public.user_assigned_program_ids(_user_id,_org_id))
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

DROP POLICY IF EXISTS "Users can view task comments" ON public.task_comments;
CREATE POLICY task_comments_scoped_select ON public.task_comments FOR SELECT TO authenticated
USING (
  public.user_has_permission(auth.uid(),(SELECT organization_id FROM public.staff_tasks WHERE id=task_id),'tasks','view','tasks')
  AND EXISTS (SELECT 1 FROM public.staff_tasks t WHERE t.id=task_id AND app_private.staff_task_is_visible_scoped(auth.uid(),t.id,t.organization_id))
);
DROP POLICY IF EXISTS "Users can create task comments" ON public.task_comments;
CREATE POLICY task_comments_scoped_insert ON public.task_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id=auth.uid()
  AND EXISTS (SELECT 1 FROM public.staff_tasks t WHERE t.id=task_id AND app_private.staff_task_is_visible_scoped(auth.uid(),t.id,t.organization_id)
    AND (t.assigned_to=auth.uid() OR public.user_is_org_elevated(auth.uid(),t.organization_id) OR public.user_has_permission(auth.uid(),t.organization_id,'tasks','manage','tasks')))
);
NOTIFY pgrst, 'reload schema';