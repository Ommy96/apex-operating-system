-- 1. register_organization: owner is always auth.uid()
DROP FUNCTION IF EXISTS public.register_organization(text,text,text,text,text,text,text,text,text,text,text,text,jsonb,uuid);
CREATE FUNCTION public.register_organization(_org_name text, _org_slug text, _org_type text, _description text DEFAULT NULL, _email text DEFAULT NULL, _phone text DEFAULT NULL, _website text DEFAULT NULL, _address text DEFAULT NULL, _country text DEFAULT NULL, _county text DEFAULT NULL, _registration_number text DEFAULT NULL, _subscription_tier text DEFAULT 'free', _features_enabled jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _new_org_id uuid; _user_id uuid := auth.uid();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF EXISTS (SELECT 1 FROM organization_members om JOIN organizations o ON o.id = om.organization_id
             WHERE om.user_id = _user_id AND om.role IN ('admin','owner') AND o.created_at > now() - interval '10 minutes') THEN
    RAISE EXCEPTION 'rate_limited: you created an organisation in the last 10 minutes';
  END IF;
  IF EXISTS (SELECT 1 FROM organizations WHERE slug = _org_slug) THEN
    RAISE EXCEPTION 'slug_taken: Organization URL "%" is already taken', _org_slug;
  END IF;
  INSERT INTO public.organizations (name, slug, organization_type, description, email, phone, website, address, country, county, registration_number, subscription_tier, subscription_status, is_active, features_enabled, onboarding_completed, onboarding_completed_at)
  VALUES (_org_name, _org_slug, _org_type, _description, _email, _phone, _website, _address, _country, _county, _registration_number, _subscription_tier, 'active', true, _features_enabled, true, now())
  RETURNING id INTO _new_org_id;
  UPDATE public.organization_members SET is_primary = false WHERE user_id = _user_id;
  INSERT INTO public.organization_members (user_id, organization_id, role, is_primary)
  VALUES (_user_id, _new_org_id, 'admin', true)
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'admin', is_primary = true;
  UPDATE public.profiles SET organization_id = _new_org_id WHERE user_id = _user_id;
  PERFORM public.seed_default_org_roles(_new_org_id, _user_id);
  RETURN jsonb_build_object('id', _new_org_id, 'slug', _org_slug);
END; $$;
REVOKE ALL ON FUNCTION public.register_organization(text,text,text,text,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_organization(text,text,text,text,text,text,text,text,text,text,text,text,jsonb) TO authenticated, service_role;

-- 2. accept_invitation by token
DROP FUNCTION IF EXISTS public.accept_invitation(uuid, uuid);
CREATE FUNCTION public.accept_invitation(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inv public.organization_invitations; _uid uuid := auth.uid(); _role_name text; _role_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT * INTO inv FROM public.organization_invitations
   WHERE token::text = _token AND status = 'pending' AND expires_at > now() FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'invitation invalid or expired'; END IF;
  IF lower(inv.email) IS DISTINCT FROM lower(auth.jwt() ->> 'email') THEN
    RAISE EXCEPTION 'this invitation was sent to a different email address';
  END IF;
  UPDATE public.organization_members SET is_primary = false WHERE user_id = _uid;
  INSERT INTO public.organization_members (user_id, organization_id, role, is_primary)
  VALUES (_uid, inv.organization_id, inv.role, true)
  ON CONFLICT (user_id, organization_id) DO UPDATE SET is_primary = true;
  UPDATE public.profiles SET organization_id = inv.organization_id WHERE user_id = _uid;
  _role_name := CASE lower(inv.role) WHEN 'admin' THEN 'org_admin' WHEN 'manager' THEN 'program_manager' ELSE lower(inv.role) END;
  SELECT id INTO _role_id FROM public.rbac_roles
   WHERE organization_id = inv.organization_id AND is_system_role AND is_active AND lower(name) = _role_name
   ORDER BY created_at LIMIT 1;
  IF _role_id IS NOT NULL THEN
    INSERT INTO public.rbac_user_role_assignments (user_id, organization_id, role_id, assigned_by, is_active)
    VALUES (_uid, inv.organization_id, _role_id, inv.invited_by, true) ON CONFLICT DO NOTHING;
  END IF;
  UPDATE public.organization_invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;
  RETURN jsonb_build_object('organization_id', inv.organization_id, 'role_assigned', _role_id IS NOT NULL);
END; $$;
REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated, service_role;

CREATE FUNCTION public.get_invitation_preview(_token text)
RETURNS TABLE(organization_name text, role_display_name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT o.name, initcap(i.role), i.email
  FROM public.organization_invitations i JOIN public.organizations o ON o.id = i.organization_id
  WHERE _token IS NOT NULL AND length(_token) >= 16 AND i.token::text = _token AND i.status = 'pending' AND i.expires_at > now()
$$;
REVOKE ALL ON FUNCTION public.get_invitation_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_preview(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can lookup invitation by token" ON public.organization_invitations;

-- 3. internal helpers
REVOKE ALL ON FUNCTION public.seed_default_org_roles(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_all_permissions_to_org_admins() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_default_role_permissions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_org_roles(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_all_permissions_to_org_admins() TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_default_role_permissions(uuid) TO service_role;

-- 4. auto_approve_request is not called anywhere: drop
DROP FUNCTION IF EXISTS public.auto_approve_request(uuid);

-- 5. rpc_allocate_donation null bypass
CREATE OR REPLACE FUNCTION public.rpc_allocate_donation(_donation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
DECLARE _org uuid; _request_id bigint; _url text; _service_key text;
BEGIN
  SELECT organization_id INTO _org FROM public.donations WHERE id = _donation_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'donation_not_found'; END IF;
  -- Server context (service role, e.g. payment webhooks firing the auto-allocate trigger) is trusted.
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
    IF NOT (public.user_belongs_to_org(auth.uid(), _org) OR public.has_role(auth.uid(), 'admin')) THEN
      RAISE EXCEPTION 'not a member of this organisation';
    END IF;
  END IF;
  _url := 'https://ncfjekjomwkfbremlyhx.supabase.co/functions/v1/allocation-engine';
  BEGIN _service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN _service_key := NULL; END;
  BEGIN
    SELECT extensions.http_post(url := _url,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || COALESCE(_service_key,'')),
      body := jsonb_build_object('mode','allocate_donation','donationId',_donation_id)) INTO _request_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'reason', 'pg_net_unavailable', 'error', SQLERRM);
  END;
  RETURN jsonb_build_object('success', true, 'request_id', _request_id);
END; $$;

-- 6. sweep
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname IN ('public','app_private') AND p.prosecdef
             AND has_function_privilege('anon', p.oid, 'EXECUTE')
             AND p.proname NOT IN ('get_shared_beneficiary_profile','get_stakeholder_portal_data','get_invitation_preview')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF r.proname NOT IN ('seed_default_org_roles','grant_all_permissions_to_org_admins','apply_default_role_permissions') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 7. profiles.role self-promotion
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT INSERT (user_id, full_name, email, phone) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, national_id, date_of_birth, gender, county, job_title, department, employment_type, start_date, staff_id, notes, last_login_at, updated_at) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. RBAC write policies
DROP POLICY IF EXISTS "Org admins can assign roles" ON public.rbac_user_role_assignments;
DROP POLICY IF EXISTS "Org admins can remove role assignments" ON public.rbac_user_role_assignments;
DROP POLICY IF EXISTS "Org admins can update role assignments" ON public.rbac_user_role_assignments;
CREATE POLICY "Role managers can assign roles" ON public.rbac_user_role_assignments FOR INSERT TO authenticated
  WITH CHECK (public.user_has_permission(auth.uid(), organization_id, 'users','manage','roles') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Role managers can update role assignments" ON public.rbac_user_role_assignments FOR UPDATE TO authenticated
  USING (public.user_has_permission(auth.uid(), organization_id, 'users','manage','roles') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.user_has_permission(auth.uid(), organization_id, 'users','manage','roles') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Role managers can remove role assignments" ON public.rbac_user_role_assignments FOR DELETE TO authenticated
  USING (public.user_has_permission(auth.uid(), organization_id, 'users','manage','roles') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Org admins can create roles" ON public.rbac_roles;
DROP POLICY IF EXISTS "Org admins can delete custom roles" ON public.rbac_roles;
DROP POLICY IF EXISTS "Org admins can update roles" ON public.rbac_roles;
CREATE POLICY "Role managers can create roles" ON public.rbac_roles FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NOT NULL AND (public.user_has_permission(auth.uid(), organization_id, 'users','manage','roles') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Role managers can update custom roles" ON public.rbac_roles FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND is_system_role = false AND (public.user_has_permission(auth.uid(), organization_id, 'users','manage','roles') OR public.has_role(auth.uid(),'admin')))
  WITH CHECK (organization_id IS NOT NULL AND (public.user_has_permission(auth.uid(), organization_id, 'users','manage','roles') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Role managers can delete custom roles" ON public.rbac_roles FOR DELETE TO authenticated
  USING (organization_id IS NOT NULL AND is_system_role = false AND (public.user_has_permission(auth.uid(), organization_id, 'users','manage','roles') OR public.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "Org admins can delete role permissions" ON public.rbac_role_permissions;
DROP POLICY IF EXISTS "Org admins can manage role permissions" ON public.rbac_role_permissions;
DROP POLICY IF EXISTS "Org admins can update role permissions" ON public.rbac_role_permissions;
CREATE POLICY "Role managers can add role permissions" ON public.rbac_role_permissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rbac_roles r WHERE r.id = role_id AND r.organization_id IS NOT NULL
    AND (public.user_has_permission(auth.uid(), r.organization_id, 'users','manage','roles') OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Role managers can update role permissions" ON public.rbac_role_permissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rbac_roles r WHERE r.id = role_id AND r.organization_id IS NOT NULL
    AND (public.user_has_permission(auth.uid(), r.organization_id, 'users','manage','roles') OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Role managers can delete role permissions" ON public.rbac_role_permissions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rbac_roles r WHERE r.id = role_id AND r.is_system_role = false AND r.organization_id IS NOT NULL
    AND (public.user_has_permission(auth.uid(), r.organization_id, 'users','manage','roles') OR public.has_role(auth.uid(),'admin'))));

CREATE OR REPLACE FUNCTION app_private.guard_last_org_admin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.is_active AND EXISTS (SELECT 1 FROM public.rbac_roles WHERE id = OLD.role_id AND name = 'org_admin')
     AND (TG_OP = 'DELETE' OR NOT NEW.is_active OR NEW.role_id <> OLD.role_id OR NEW.user_id <> OLD.user_id)
     AND NOT EXISTS (SELECT 1 FROM public.rbac_user_role_assignments a JOIN public.rbac_roles r ON r.id = a.role_id
                     WHERE a.organization_id = OLD.organization_id AND a.is_active AND r.name = 'org_admin'
                       AND a.user_id <> OLD.user_id)
     AND EXISTS (SELECT 1 FROM public.organizations WHERE id = OLD.organization_id) THEN
    RAISE EXCEPTION 'This is the last active organisation admin. Assign another admin first.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
REVOKE ALL ON FUNCTION app_private.guard_last_org_admin() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_last_org_admin ON public.rbac_user_role_assignments;
CREATE TRIGGER guard_last_org_admin BEFORE UPDATE OR DELETE ON public.rbac_user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION app_private.guard_last_org_admin();

-- 9. merge: legacy stub is not called by the app
DROP FUNCTION IF EXISTS public.merge_beneficiaries(uuid, uuid, uuid, text);

NOTIFY pgrst, 'reload schema';