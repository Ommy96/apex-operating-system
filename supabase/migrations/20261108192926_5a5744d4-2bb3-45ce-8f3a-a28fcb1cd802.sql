ALTER TABLE public.allocations ADD COLUMN IF NOT EXISTS fx_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE OR REPLACE FUNCTION public.capture_donor_allocation_fx() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' THEN
 NEW.fx_snapshot := jsonb_build_object(upper(NEW.base_currency),1);
 IF NEW.fx_rate>0 THEN NEW.fx_snapshot := NEW.fx_snapshot || jsonb_build_object(upper(NEW.native_currency),1/NEW.fx_rate); END IF;
 NEW.fx_snapshot := COALESCE((SELECT jsonb_object_agg(upper(target_currency),rate) FROM (SELECT DISTINCT ON (upper(target_currency)) target_currency,rate FROM public.currency_rates WHERE upper(base_currency)=upper(NEW.base_currency) AND rate_date<=NEW.fx_at::date AND rate>0 ORDER BY upper(target_currency),rate_date DESC) r),'{}'::jsonb) || NEW.fx_snapshot;
 ELSIF NEW.fx_snapshot IS DISTINCT FROM OLD.fx_snapshot OR NEW.fx_rate IS DISTINCT FROM OLD.fx_rate OR NEW.fx_at IS DISTINCT FROM OLD.fx_at THEN RAISE EXCEPTION 'Captured allocation exchange rates are immutable'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER capture_donor_allocation_fx BEFORE INSERT OR UPDATE ON public.allocations FOR EACH ROW EXECUTE FUNCTION public.capture_donor_allocation_fx();
CREATE OR REPLACE FUNCTION public.set_donor_currency(_currency text) RETURNS SETOF public.donor_accounts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL OR upper(_currency) NOT IN ('USD','EUR','GBP','KES','UGX','TZS','ZAR','NGN','CAD','AUD') THEN RAISE EXCEPTION 'Invalid currency or signed-out account'; END IF;
 RETURN QUERY UPDATE public.donor_accounts SET preferred_currency=upper(_currency),updated_at=now() WHERE user_id=auth.uid() AND is_active RETURNING *; END $$;
REVOKE ALL ON FUNCTION public.set_donor_currency(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.set_donor_currency(text) TO authenticated;
ALTER TABLE public.visit_requests ADD COLUMN IF NOT EXISTS request_kind text NOT NULL DEFAULT 'visit', ADD COLUMN IF NOT EXISTS response_draft text, ADD COLUMN IF NOT EXISTS approved_response text, ADD COLUMN IF NOT EXISTS response_approved_at timestamptz, ADD COLUMN IF NOT EXISTS response_approved_by uuid;
CREATE OR REPLACE FUNCTION public.donor_review_allowed(_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$ SELECT public.has_role(auth.uid(),'admin') OR (public.user_belongs_to_org(auth.uid(),_org) AND (public.get_org_member_role(auth.uid(),_org) IN ('owner','admin','org_admin') OR public.user_has_permission(auth.uid(),_org,'reports','approve','reports'))) $$;
REVOKE ALL ON FUNCTION public.donor_review_allowed(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.donor_review_allowed(uuid) TO authenticated;
DROP POLICY IF EXISTS org_members_view_visit_requests ON public.visit_requests;
CREATE POLICY org_members_view_visit_requests ON public.visit_requests FOR SELECT TO authenticated USING (public.user_belongs_to_org(auth.uid(),organization_id) OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS org_members_insert_visit_requests ON public.visit_requests;
CREATE POLICY org_members_insert_visit_requests ON public.visit_requests FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_org(auth.uid(),organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.donor_request_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.request_kind NOT IN ('visit','visit_report','update') THEN RAISE EXCEPTION 'Invalid request kind'; END IF;
 IF TG_OP='INSERT' THEN
 IF NEW.status<>'requested' OR NEW.approved_response IS NOT NULL OR NEW.response_approved_at IS NOT NULL THEN RAISE EXCEPTION 'Requests must begin pending review'; END IF;
 ELSIF NEW.approved_response IS DISTINCT FROM OLD.approved_response OR NEW.response_approved_at IS DISTINCT FROM OLD.response_approved_at THEN
 IF NOT public.donor_review_allowed(NEW.organization_id) THEN RAISE EXCEPTION 'Report approval permission required'; END IF;
 IF NEW.approved_response IS NOT NULL AND trim(NEW.approved_response)<>'' THEN NEW.response_approved_at=now(); NEW.response_approved_by=auth.uid(); ELSE NEW.response_approved_at=NULL; NEW.response_approved_by=NULL; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
 IF NOT ((OLD.status='requested' AND NEW.status IN ('approved','declined')) OR (OLD.status='approved' AND NEW.status IN ('scheduled','completed')) OR (OLD.status='scheduled' AND NEW.status='conducted') OR (OLD.status='conducted' AND NEW.status='completed')) THEN RAISE EXCEPTION 'Invalid request status transition'; END IF;
 IF NEW.status IN ('approved','declined') AND NOT public.donor_review_allowed(NEW.organization_id) THEN RAISE EXCEPTION 'Approval permission required'; END IF;
 NEW.status_history=COALESCE(OLD.status_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('from',OLD.status,'to',NEW.status,'at',now(),'by',auth.uid()));
 END IF; RETURN NEW; END $$;
CREATE TRIGGER donor_request_guard BEFORE INSERT OR UPDATE ON public.visit_requests FOR EACH ROW EXECUTE FUNCTION public.donor_request_guard();
CREATE OR REPLACE FUNCTION public.create_donor_request(_beneficiary uuid,_kind text,_purpose text,_date date DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a public.donor_accounts; r uuid; BEGIN
 SELECT * INTO a FROM public.donor_accounts WHERE user_id=auth.uid() AND is_active;
 IF a.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.beneficiary_donors b WHERE b.organization_id=a.organization_id AND b.donor_name=a.donor_name AND b.beneficiary_id=_beneficiary) THEN RAISE EXCEPTION 'Beneficiary outside your sponsorship'; END IF;
 INSERT INTO public.visit_requests(organization_id,donor_account_id,beneficiary_id,request_kind,purpose,requested_date,requested_by_user,status) VALUES(a.organization_id,a.id,_beneficiary,_kind,_purpose,_date,auth.uid(),'requested') RETURNING id INTO r;
 INSERT INTO public.notifications(user_id,organization_id,title,message,category,related_entity_id,related_entity_type) SELECT om.user_id,a.organization_id,'Donor request awaiting review',_kind,'donor_request',r,'visit_requests' FROM public.organization_members om WHERE om.organization_id=a.organization_id AND om.is_active AND om.role::text IN ('owner','admin');
 INSERT INTO public.audit_logs(user_id,event_type,entity_type,entity_id,new_values) VALUES(auth.uid(),'donor_request_created','visit_requests',r,jsonb_build_object('organization_id',a.organization_id,'request_kind',_kind)); RETURN r; END $$;
REVOKE ALL ON FUNCTION public.create_donor_request(uuid,text,text,date) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.create_donor_request(uuid,text,text,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_donor_requests() RETURNS TABLE(id uuid,beneficiary_id uuid,request_kind text,status text,purpose text,requested_date date,scheduled_date timestamptz,created_at timestamptz,approved_response text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT r.id,r.beneficiary_id,r.request_kind,r.status,r.purpose,r.requested_date,r.scheduled_date,r.created_at,CASE WHEN r.response_approved_at IS NOT NULL THEN r.approved_response END FROM public.visit_requests r JOIN public.donor_accounts a ON a.id=r.donor_account_id AND a.organization_id=r.organization_id WHERE a.user_id=auth.uid() AND a.is_active AND r.deleted_at IS NULL $$;
REVOKE ALL ON FUNCTION public.get_donor_requests() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.get_donor_requests() TO authenticated;
ALTER TABLE public.sponsorship_updates ALTER COLUMN visible_to_donor SET DEFAULT false;
ALTER TABLE public.sponsorship_updates ADD COLUMN IF NOT EXISTS approved_at timestamptz, ADD COLUMN IF NOT EXISTS approved_by uuid, ADD COLUMN IF NOT EXISTS contribution_id uuid REFERENCES public.donations(id);
CREATE OR REPLACE FUNCTION public.donor_update_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.visible_to_donor AND (TG_OP='INSERT' OR NOT OLD.visible_to_donor OR NEW.content IS DISTINCT FROM OLD.content OR NEW.file_url IS DISTINCT FROM OLD.file_url) THEN
 IF NOT public.donor_review_allowed(NEW.organization_id) THEN RAISE EXCEPTION 'Sponsor update approval permission required'; END IF; NEW.approved_at=now(); NEW.approved_by=auth.uid(); END IF;
 IF NEW.update_type='thank_you_letter' AND NOT EXISTS(SELECT 1 FROM public.donations d WHERE d.id=NEW.contribution_id AND d.organization_id=NEW.organization_id AND d.amount>0 AND d.status IN ('completed','succeeded','success','received')) THEN RAISE EXCEPTION 'Thank-you notes require a recorded received contribution'; END IF; RETURN NEW; END $$;
CREATE TRIGGER donor_update_guard BEFORE INSERT OR UPDATE ON public.sponsorship_updates FOR EACH ROW EXECUTE FUNCTION public.donor_update_guard();
DROP POLICY IF EXISTS "Donors view their sponsorship updates" ON public.sponsorship_updates;
CREATE POLICY "Donors view their sponsorship updates" ON public.sponsorship_updates FOR SELECT TO authenticated USING (visible_to_donor AND approved_at IS NOT NULL AND deleted_at IS NULL AND public.is_donor_of_beneficiary(beneficiary_id));
CREATE OR REPLACE FUNCTION public.enforce_sponsor_shareable_document() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE sensitive boolean; BEGIN
 IF NEW.share_with_sponsor THEN
 SELECT is_sensitive OR is_consent_type INTO sensitive FROM public.document_types WHERE organization_id=NEW.organization_id AND key=NEW.document_type LIMIT 1;
 IF COALESCE(sensitive,false) OR COALESCE(NEW.document_type,'') ~* '(consent|medical|health|intake|assessment|national_id|birth_cert|safeguard|legal|case)' THEN RAISE EXCEPTION 'This document type can never be shared with sponsors'; END IF;
 IF NOT public.donor_review_allowed(NEW.organization_id) THEN RAISE EXCEPTION 'Sponsor sharing approval permission required'; END IF; NEW.shared_at=now(); NEW.shared_by=auth.uid(); ELSE NEW.shared_at=NULL; NEW.shared_by=NULL; END IF; RETURN NEW; END $$;
ALTER TABLE public.beneficiary_uploads ALTER COLUMN share_with_sponsor SET DEFAULT false;
CREATE POLICY "Donors download explicitly shared files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='beneficiary-documents' AND EXISTS(SELECT 1 FROM public.beneficiary_uploads b WHERE b.share_with_sponsor AND b.shared_at IS NOT NULL AND public.is_donor_of_beneficiary(b.beneficiary_id) AND (b.file_url=name OR b.file_url LIKE '%/beneficiary-documents/'||name) AND b.document_type !~* '(consent|medical|health|intake|assessment|safeguard|case)'));
CREATE OR REPLACE FUNCTION public.donor_contact_permitted(_beneficiary uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.is_donor_of_beneficiary(_beneficiary) AND EXISTS(SELECT 1 FROM public.consent_records c WHERE c.beneficiary_id=_beneficiary AND c.consent_given AND c.status='active' AND c.withdrawal_date IS NULL AND (c.expiry_date IS NULL OR c.expiry_date>now()) AND c.consent_type IN ('sponsor_contact','birthday_contact')) $$;
REVOKE ALL ON FUNCTION public.donor_contact_permitted(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.donor_contact_permitted(uuid) TO authenticated;
CREATE POLICY "Donors read own received contributions" ON public.donations FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.donor_accounts a WHERE a.id=donations.donor_account_id AND a.organization_id=donations.organization_id AND a.user_id=auth.uid() AND a.is_active));
NOTIFY pgrst,'reload schema';