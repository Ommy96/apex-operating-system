CREATE OR REPLACE FUNCTION app_private.generate_donor_thanks(_donation uuid,_beneficiary uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE d public.donations; r uuid; BEGIN
 SELECT * INTO d FROM public.donations WHERE id=_donation;
 IF d.id IS NULL OR NOT public.donor_review_allowed(d.organization_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF d.amount<=0 OR d.status NOT IN ('completed','succeeded','success','received') THEN RAISE EXCEPTION 'Only recorded received contributions can be acknowledged'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.beneficiaries b WHERE b.id=_beneficiary AND b.organization_id=d.organization_id) THEN RAISE EXCEPTION 'Beneficiary outside organisation'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.donor_accounts a JOIN public.beneficiary_donors b ON b.organization_id=a.organization_id AND b.donor_name=a.donor_name WHERE a.id=d.donor_account_id AND b.beneficiary_id=_beneficiary) THEN RAISE EXCEPTION 'Contribution not linked to this sponsorship'; END IF;
 SELECT id INTO r FROM public.sponsorship_updates WHERE contribution_id=d.id AND beneficiary_id=_beneficiary AND update_type='thank_you_letter' AND deleted_at IS NULL;
 IF r IS NOT NULL THEN RETURN r; END IF;
 INSERT INTO public.sponsorship_updates(organization_id,beneficiary_id,donor_name,update_type,title,content,contribution_id,visible_to_donor,created_by) VALUES(d.organization_id,_beneficiary,d.donor_name,'thank_you_letter','Thank you for your received contribution','Thank you. We recorded receipt of '||d.currency||' '||d.amount::text||'.',d.id,false,auth.uid()) RETURNING id INTO r; RETURN r; END $$;
REVOKE ALL ON FUNCTION app_private.generate_donor_thanks(uuid,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION app_private.generate_donor_thanks(uuid,uuid) TO authenticated;
CREATE FUNCTION public.generate_donor_thanks(_donation uuid,_beneficiary uuid) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT app_private.generate_donor_thanks(_donation,_beneficiary) $$;
REVOKE ALL ON FUNCTION public.generate_donor_thanks(uuid,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.generate_donor_thanks(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.managed_sponsor_sharing_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.donor_visible THEN
 IF COALESCE(NEW.document_type,'') ~* '(consent|medical|health|intake|assessment|safeguard|case)' THEN RAISE EXCEPTION 'Sensitive document types can never be shared'; END IF;
 IF NOT public.donor_review_allowed(NEW.organization_id) THEN RAISE EXCEPTION 'Sharing approval permission required'; END IF; END IF; RETURN NEW; END $$;
CREATE TRIGGER managed_sponsor_sharing_guard BEFORE INSERT OR UPDATE ON public.managed_documents FOR EACH ROW EXECUTE FUNCTION public.managed_sponsor_sharing_guard();
CREATE OR REPLACE FUNCTION app_private.log_donor_document_access(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.beneficiary_uploads b WHERE b.id=_id AND b.share_with_sponsor AND b.shared_at IS NOT NULL AND public.is_donor_of_beneficiary(b.beneficiary_id)) THEN RAISE EXCEPTION 'Document not shared with you'; END IF;
 INSERT INTO public.audit_logs(user_id,event_type,entity_type,entity_id) VALUES(auth.uid(),'donor_document_view','beneficiary_uploads',_id); END $$;
REVOKE ALL ON FUNCTION app_private.log_donor_document_access(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION app_private.log_donor_document_access(uuid) TO authenticated;
CREATE FUNCTION public.log_donor_document_access(_id uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT app_private.log_donor_document_access(_id) $$;
REVOKE ALL ON FUNCTION public.log_donor_document_access(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.log_donor_document_access(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.donor_birthday_message_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.kind='birthday_message' AND EXISTS(SELECT 1 FROM public.donor_accounts a WHERE a.id=NEW.donor_account_id AND a.user_id=auth.uid()) THEN
 IF NOT public.donor_contact_permitted(NEW.beneficiary_id) OR NOT EXISTS(SELECT 1 FROM public.beneficiaries b JOIN public.organizations o ON o.id=b.organization_id WHERE b.id=NEW.beneficiary_id AND b.date_of_birth IS NOT NULL AND o.donor_birthday_alerts_enabled IS DISTINCT FROM false) THEN RAISE EXCEPTION 'Birthday contact requires DOB and contact consent'; END IF; END IF; RETURN NEW; END $$;
CREATE TRIGGER donor_birthday_message_guard BEFORE INSERT ON public.sponsor_correspondence FOR EACH ROW EXECUTE FUNCTION public.donor_birthday_message_guard();
NOTIFY pgrst,'reload schema';