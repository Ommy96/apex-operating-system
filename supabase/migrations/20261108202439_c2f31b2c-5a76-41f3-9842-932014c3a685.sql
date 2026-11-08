ALTER TABLE public.indicators ADD COLUMN IF NOT EXISTS limitations text, ADD COLUMN IF NOT EXISTS donor_shareable boolean NOT NULL DEFAULT false;
ALTER TABLE public.indicator_values ADD COLUMN IF NOT EXISTS numerator numeric, ADD COLUMN IF NOT EXISTS denominator numeric;
CREATE OR REPLACE FUNCTION public.results_indicator_access(_indicator uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.indicators i WHERE i.id=_indicator AND (public.has_role(auth.uid(),'admin') OR (public.user_belongs_to_org(auth.uid(),i.organization_id) AND NOT app_private.user_is_donor_for_org(auth.uid(),i.organization_id) AND (NOT (public.user_is_program_scoped(auth.uid(),i.organization_id) OR public.user_is_field_scoped(auth.uid(),i.organization_id)) OR EXISTS(SELECT 1 FROM public.programme_team t WHERE t.org_id=i.organization_id AND t.staff_id=auth.uid() AND t.program_id=ANY(i.program_ids) AND (t.start_date IS NULL OR t.start_date<=current_date) AND (t.end_date IS NULL OR t.end_date>=current_date))))))
$$;
GRANT EXECUTE ON FUNCTION public.results_indicator_access(uuid) TO authenticated;
CREATE TABLE public.indicator_reporting_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id), indicator_id uuid NOT NULL REFERENCES public.indicators(id), period_start date NOT NULL, period_end date NOT NULL, version integer NOT NULL, amends_id uuid REFERENCES public.indicator_reporting_snapshots(id), amendment_reason text, snapshot jsonb NOT NULL, approved_by uuid NOT NULL, approved_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid, deleted_at timestamptz, UNIQUE(indicator_id,period_start,period_end,version)
);
GRANT SELECT,INSERT ON public.indicator_reporting_snapshots TO authenticated;
GRANT ALL ON public.indicator_reporting_snapshots TO service_role;
ALTER TABLE public.indicator_reporting_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY results_snapshot_read ON public.indicator_reporting_snapshots FOR SELECT TO authenticated USING (public.results_indicator_access(indicator_id));
CREATE POLICY results_snapshot_create ON public.indicator_reporting_snapshots FOR INSERT TO authenticated WITH CHECK (public.results_indicator_access(indicator_id) AND public.donor_review_allowed(organization_id) AND approved_by=auth.uid() AND EXISTS(SELECT 1 FROM public.indicators i WHERE i.id=indicator_id AND i.organization_id=organization_id));
CREATE POLICY results_snapshot_no_update ON public.indicator_reporting_snapshots FOR UPDATE TO authenticated USING(false) WITH CHECK(false);
CREATE POLICY results_snapshot_no_delete ON public.indicator_reporting_snapshots FOR DELETE TO authenticated USING(false);
CREATE OR REPLACE FUNCTION public.results_achievement(_actual numeric,_target numeric,_direction text,_denominator numeric DEFAULT 1) RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE WHEN _actual IS NULL OR _target IS NULL OR _target<=0 OR _denominator IS NULL OR _denominator<=0 OR _actual<0 THEN NULL WHEN _direction='down_is_good' THEN CASE WHEN _actual=0 THEN NULL ELSE _target/_actual*100 END ELSE _actual/_target*100 END $$;
CREATE OR REPLACE FUNCTION public.compute_results_indicator(_indicator uuid,_start date,_end date) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE i public.indicators; cfg jsonb; part jsonb; src text; rows jsonb; n numeric; d numeric:=1; v numeric; vals numeric[]:='{}'; mode text; k integer; manual public.indicator_values;
BEGIN
 IF _start IS NULL OR _end IS NULL OR _end<_start THEN RAISE EXCEPTION 'Invalid reporting period'; END IF;
 SELECT * INTO i FROM public.indicators WHERE id=_indicator AND deleted_at IS NULL;
 IF i.id IS NULL OR NOT public.results_indicator_access(i.id) THEN RAISE EXCEPTION 'Indicator access denied'; END IF;
 cfg:=i.formula_config;
 IF i.formula_type='custom' THEN
 SELECT * INTO manual FROM public.indicator_values WHERE indicator_id=i.id AND period_start=_start AND period_end=_end AND disaggregation_category_id IS NULL AND disaggregation_value IS NULL AND dimension_key IS NULL ORDER BY created_at DESC,id DESC LIMIT 1;
 v:=manual.actual_value; n:=manual.numerator; d:=CASE WHEN lower(i.unit) IN ('percentage','ratio','rate') THEN manual.denominator ELSE 1 END;
 ELSE
 FOR k IN 1..CASE WHEN i.formula_type IN ('ratio','percentage') THEN 2 ELSE 1 END LOOP
 part:=CASE WHEN i.formula_type IN ('ratio','percentage') THEN cfg->CASE WHEN k=1 THEN 'numerator' ELSE 'denominator' END ELSE cfg END;
 src:=part->>'table';
 IF src NOT IN ('beneficiaries','beneficiary_services','beneficiary_progress_logs') OR src IS NULL THEN RAISE EXCEPTION 'Unsupported source: choose a current beneficiary source or manual measurement'; END IF;
 IF i.level IN ('outcome','impact') AND src IN ('beneficiaries','beneficiary_services') THEN RAISE EXCEPTION 'Enrollment and reach are outputs, not outcomes; choose measured change records'; END IF;
 IF src='beneficiaries' THEN
 SELECT coalesce(jsonb_agg(to_jsonb(b)),'[]') INTO rows FROM public.beneficiaries b WHERE b.organization_id=i.organization_id AND b.deleted_at IS NULL AND (coalesce(cardinality(i.program_ids),0)=0 OR EXISTS(SELECT 1 FROM public.beneficiary_services s WHERE s.beneficiary_id=b.id AND s.organization_id=i.organization_id AND s.program_id=ANY(i.program_ids) AND s.enrolled_date<=_end AND (s.exit_date IS NULL OR s.exit_date>=_start)));
 ELSIF src='beneficiary_services' THEN
 SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') INTO rows FROM public.beneficiary_services s JOIN public.beneficiaries b ON b.id=s.beneficiary_id AND b.organization_id=s.organization_id AND b.deleted_at IS NULL WHERE s.organization_id=i.organization_id AND (coalesce(cardinality(i.program_ids),0)=0 OR s.program_id=ANY(i.program_ids)) AND s.enrolled_date<=_end AND (s.exit_date IS NULL OR s.exit_date>=_start);
 ELSE
 SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') INTO rows FROM public.beneficiary_progress_logs p JOIN public.beneficiaries b ON b.id=p.beneficiary_id AND b.organization_id=p.organization_id AND b.deleted_at IS NULL WHERE p.organization_id=i.organization_id AND p.log_date BETWEEN _start AND _end AND (coalesce(cardinality(i.program_ids),0)=0 OR EXISTS(SELECT 1 FROM public.beneficiary_services s WHERE s.organization_id=i.organization_id AND s.beneficiary_id=p.beneficiary_id AND s.program_id=ANY(i.program_ids) AND s.enrolled_date<=_end AND (s.exit_date IS NULL OR s.exit_date>=_start)));
 END IF;
 SELECT coalesce(jsonb_agg(r),'[]') INTO rows FROM jsonb_array_elements(rows) r WHERE r @> coalesce(part->'filters','{}') AND (part->>'date_range' IS DISTINCT FROM 'current_period' OR (r->>(part->>'date_field'))::date BETWEEN _start AND _end);
 mode:=CASE WHEN i.formula_type IN ('percentage','ratio') THEN 'count' ELSE i.formula_type END;
 IF mode='count' THEN SELECT count(DISTINCT CASE WHEN src='beneficiaries' THEN r->>'id' ELSE r->>'beneficiary_id' END) INTO v FROM jsonb_array_elements(rows) r;
 ELSE
 IF src<>'beneficiary_progress_logs' OR part->>'field'<>'progress_value' THEN RAISE EXCEPTION 'Only measured progress_value supports numeric aggregation'; END IF;
 WITH latest AS (SELECT DISTINCT ON(r->>'beneficiary_id') r FROM jsonb_array_elements(rows) r WHERE r->>'progress_value' IS NOT NULL ORDER BY r->>'beneficiary_id',r->>'log_date' DESC,r->>'created_at' DESC,r->>'id' DESC) SELECT CASE WHEN mode='sum' THEN sum((r->>'progress_value')::numeric) WHEN mode='average' THEN avg((r->>'progress_value')::numeric) END INTO v FROM latest;
 END IF;
 vals:=array_append(vals,v);
 END LOOP;
 n:=vals[1]; IF i.formula_type IN ('ratio','percentage') THEN d:=vals[2]; v:=CASE WHEN d>0 THEN n/d*CASE WHEN i.formula_type='percentage' THEN 100 ELSE 1 END ELSE NULL END; ELSE v:=n; END IF;
 END IF;
 RETURN jsonb_build_object('id',i.id,'name',i.name,'definition',i.description,'objective_id',i.logframe_entry_id,'baseline',i.baseline_value,'target',coalesce((SELECT t.target_value FROM public.indicator_targets t WHERE t.indicator_id=i.id AND t.period_year=extract(year FROM _start) AND ((t.period_type='monthly' AND t.period_value=extract(month FROM _start) AND _end=(_start+interval '1 month'-interval '1 day')::date) OR (t.period_type='quarterly' AND t.period_value=extract(quarter FROM _start) AND _end=(_start+interval '3 months'-interval '1 day')::date) OR (t.period_type='yearly' AND _start=date_trunc('year',_start)::date AND _end=(_start+interval '1 year'-interval '1 day')::date)) ORDER BY t.created_at DESC LIMIT 1),i.target_value),'current',v,'numerator',n,'denominator',d,'direction',i.trend_direction,'level',i.level,'unit',i.unit,'formula',cfg,'calculation_method',i.calculation_method,'period_start',_start,'period_end',_end,'limitations',coalesce(nullif(i.limitations,''),'No limitations documented; interpret cautiously.'),'donor_shareable',i.donor_shareable,'definition_version',i.version);
END $$;
GRANT EXECUTE ON FUNCTION public.compute_results_indicator(uuid,date,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_results_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE i public.indicators; prev public.indicator_reporting_snapshots; calculated jsonb;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Approved periods are immutable; create an amendment'; END IF;
 SELECT * INTO i FROM public.indicators WHERE id=NEW.indicator_id FOR UPDATE;
 IF NOT public.results_indicator_access(i.id) OR NOT public.donor_review_allowed(i.organization_id) THEN RAISE EXCEPTION 'Report approval permission required'; END IF;
 IF nullif(trim(i.description),'') IS NULL OR nullif(trim(i.calculation_method),'') IS NULL THEN RAISE EXCEPTION 'Definition and calculation method are required'; END IF;
 SELECT * INTO prev FROM public.indicator_reporting_snapshots WHERE indicator_id=i.id AND period_start=NEW.period_start AND period_end=NEW.period_end ORDER BY version DESC LIMIT 1;
 IF prev.id IS NOT NULL AND (NEW.amends_id IS DISTINCT FROM prev.id OR nullif(trim(NEW.amendment_reason),'') IS NULL) THEN RAISE EXCEPTION 'Correction must amend the latest approved version with a reason'; END IF;
 IF prev.id IS NULL AND NEW.amends_id IS NOT NULL THEN RAISE EXCEPTION 'No prior period to amend'; END IF;
 calculated:=public.compute_results_indicator(i.id,NEW.period_start,NEW.period_end);
 calculated:=calculated||jsonb_build_object('percent',public.results_achievement((calculated->>'current')::numeric,(calculated->>'target')::numeric,i.trend_direction,(calculated->>'denominator')::numeric));
 NEW.organization_id:=i.organization_id; NEW.approved_by:=auth.uid(); NEW.approved_at:=now(); NEW.created_at:=now(); NEW.updated_at:=now(); NEW.updated_by:=auth.uid(); NEW.version:=coalesce(prev.version,0)+1; NEW.snapshot:=calculated; NEW.deleted_at:=NULL;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_results_snapshot BEFORE INSERT OR UPDATE OR DELETE ON public.indicator_reporting_snapshots FOR EACH ROW EXECUTE FUNCTION public.guard_results_snapshot();
CREATE OR REPLACE FUNCTION app_private.get_donor_results() RETURNS TABLE(id uuid,indicator_id uuid,period_start date,period_end date,version integer,snapshot jsonb) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT s.id,s.indicator_id,s.period_start,s.period_end,s.version,s.snapshot-'formula'-'objective_id' FROM public.indicator_reporting_snapshots s JOIN public.donor_accounts d ON d.organization_id=s.organization_id AND d.user_id=auth.uid() AND d.is_active WHERE (s.snapshot->>'donor_shareable')::boolean AND EXISTS(SELECT 1 FROM public.indicators i WHERE i.id=s.indicator_id AND EXISTS(SELECT 1 FROM public.beneficiary_donors bd WHERE bd.organization_id=d.organization_id AND bd.donor_name=d.donor_name AND bd.program_id=ANY(i.program_ids))) AND NOT EXISTS(SELECT 1 FROM public.indicator_reporting_snapshots newer WHERE newer.indicator_id=s.indicator_id AND newer.period_start=s.period_start AND newer.period_end=s.period_end AND newer.version>s.version) AND (s.snapshot->>'denominator')::numeric>=5 AND (s.snapshot->>'numerator')::numeric>=5
$$;
REVOKE ALL ON FUNCTION app_private.get_donor_results() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION app_private.get_donor_results() TO authenticated;
CREATE OR REPLACE FUNCTION public.get_donor_results() RETURNS TABLE(id uuid,indicator_id uuid,period_start date,period_end date,version integer,snapshot jsonb) LANGUAGE sql STABLE SET search_path=public AS $$ SELECT * FROM app_private.get_donor_results() $$;
REVOKE ALL ON FUNCTION public.get_donor_results() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_donor_results() TO authenticated;
NOTIFY pgrst,'reload schema';