DO $$ DECLARE def text; BEGIN SELECT pg_get_functiondef('public.compute_results_indicator(uuid,date,date)'::regprocedure) INTO def;
 def:=replace(def,'src:=part->>''table'';','src:=part->>''table''; IF src=''children'' THEN src:=''beneficiaries''; END IF; IF src=''alumni'' THEN src:=''beneficiaries''; part:=jsonb_set(coalesce(part,''{}''),''{filters,status}'',''"graduated"''); END IF; IF lower(part->''filters''->>''gender'') IN (''male'',''female'') THEN part:=jsonb_set(part,''{filters,gender}'',to_jsonb(initcap(part->''filters''->>''gender''))); END IF;');
 EXECUTE def;
END $$;
NOTIFY pgrst,'reload schema';