REVOKE ALL ON public.reporting_obligations FROM anon;
COMMENT ON TABLE public.reporting_obligations IS '@graphql({"omit": true})';
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app_private' AND p.proname='create_or_get_source_task';
 d:=replace(d,$q$public.user_has_permission(auth.uid(),_org,'tasks','manage','tasks')$q$,$q$public.user_has_permission(auth.uid(),_org,'tasks','manage','tasks') OR (_type='reporting_obligation' AND public.can_manage_reporting(_org))$q$);
 EXECUTE d;
END $$;
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='prepare_reporting_nudge';
 d:=replace(d,'PERFORM set_config(''request.jwt.claim.role'',''service_role'',true);',''); EXECUTE d;
END $$;
ALTER FUNCTION public.can_manage_reporting(uuid) SET SCHEMA app_private;
CREATE FUNCTION public.can_manage_reporting(_org uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=public,app_private AS $$ SELECT app_private.can_manage_reporting(_org) $$;
ALTER FUNCTION public.can_read_reporting(uuid,uuid,uuid,uuid) SET SCHEMA app_private;
CREATE FUNCTION public.can_read_reporting(_org uuid,_user uuid,_program uuid,_project uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=public,app_private AS $$ SELECT app_private.can_read_reporting(_org,_user,_program,_project) $$;
ALTER FUNCTION public.get_reporting_ledger(uuid,date,date) SET SCHEMA app_private;
CREATE FUNCTION public.get_reporting_ledger(_org_id uuid,_from date,_to date) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public,app_private AS $$ SELECT app_private.get_reporting_ledger(_org_id,_from,_to) $$;
ALTER FUNCTION public.reporting_team_options(uuid) SET SCHEMA app_private;
CREATE FUNCTION public.reporting_team_options(_org_id uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public,app_private AS $$ SELECT app_private.reporting_team_options(_org_id) $$;
ALTER FUNCTION public.prepare_reporting_nudge(uuid,date) SET SCHEMA app_private;
CREATE FUNCTION public.prepare_reporting_nudge(_obligation uuid,_period date) RETURNS jsonb LANGUAGE sql SET search_path=public,app_private AS $$ SELECT app_private.prepare_reporting_nudge(_obligation,_period) $$;
REVOKE ALL ON FUNCTION public.can_manage_reporting(uuid),public.can_read_reporting(uuid,uuid,uuid,uuid),public.get_reporting_ledger(uuid,date,date),public.reporting_team_options(uuid),public.prepare_reporting_nudge(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_manage_reporting(uuid),public.can_read_reporting(uuid,uuid,uuid,uuid),public.get_reporting_ledger(uuid,date,date),public.reporting_team_options(uuid),public.prepare_reporting_nudge(uuid,date) TO authenticated,service_role;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='reporting_obligations') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.reporting_obligations; END IF; END $$;
NOTIFY pgrst, 'reload schema';