REVOKE ALL ON FUNCTION app_private.quality_staff_access(uuid),app_private.quality_manage_access(uuid),app_private.quality_beneficiary_access(uuid,uuid),app_private.quality_entity_access(uuid,text,uuid),app_private.quality_rule_failed(uuid,uuid),app_private.quality_merge_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION app_private.quality_staff_access(uuid),app_private.quality_manage_access(uuid),app_private.quality_beneficiary_access(uuid,uuid),app_private.quality_entity_access(uuid,text,uuid),app_private.quality_rule_failed(uuid,uuid),app_private.quality_merge_access(uuid) TO authenticated;
DROP POLICY quality_flags_update ON public.data_quality_flags;
REVOKE UPDATE,DELETE ON public.data_quality_flags FROM authenticated;
DROP POLICY quality_duplicates_update ON public.duplicate_candidates;
REVOKE UPDATE,DELETE ON public.duplicate_candidates FROM authenticated;
DO $$ DECLARE r public.data_quality_rules; did_reject boolean:=false; BEGIN
 IF has_function_privilege('anon','public.scan_data_quality(uuid)','EXECUTE') OR has_function_privilege('anon','public.recheck_data_quality_issue(uuid,text)','EXECUTE') OR has_function_privilege('anon','public.reviewed_beneficiary_merge(uuid,uuid,uuid,text,jsonb)','EXECUTE') OR has_table_privilege('anon','public.data_quality_flags','SELECT') OR has_table_privilege('authenticated','public.data_quality_flags','UPDATE') THEN RAISE EXCEPTION 'Quality access regression'; END IF;
 SELECT * INTO r FROM public.data_quality_rules LIMIT 1;
 IF r.id IS NOT NULL THEN
 BEGIN UPDATE public.data_quality_rules SET config='{"query":"select * from beneficiaries"}' WHERE id=r.id; EXCEPTION WHEN raise_exception THEN did_reject:=true; END;
 IF NOT did_reject THEN RAISE EXCEPTION 'Unrestricted rule configuration accepted'; END IF;
 did_reject:=false;
 BEGIN UPDATE public.data_quality_rules SET template_key='arbitrary_code' WHERE id=r.id; EXCEPTION WHEN raise_exception THEN did_reject:=true; END;
 IF NOT did_reject THEN RAISE EXCEPTION 'Unapproved rule template accepted'; END IF;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';