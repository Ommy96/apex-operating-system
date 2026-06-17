
-- Ensure pg_net is available (Supabase usually has this enabled in extensions schema)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =========================================================
-- RPC: rpc_allocate_donation
-- =========================================================
CREATE OR REPLACE FUNCTION public.rpc_allocate_donation(_donation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _org uuid;
  _request_id bigint;
  _url text;
  _service_key text;
BEGIN
  SELECT organization_id INTO _org FROM public.donations WHERE id = _donation_id;
  IF _org IS NULL THEN
    RAISE EXCEPTION 'donation_not_found';
  END IF;

  -- Authorization: caller must belong to org or be a super-admin (skip when invoked from a trigger as service role)
  IF auth.uid() IS NOT NULL THEN
    IF NOT (public.user_belongs_to_org(auth.uid(), _org) OR public.has_role(auth.uid(), 'admin')) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  -- Build the function URL from the current project ref
  _url := 'https://ncfjekjomwkfbremlyhx.supabase.co/functions/v1/allocation-engine';

  -- service role key is needed in the Authorization header for verify_jwt-less calls
  BEGIN
    _service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    _service_key := NULL;
  END;

  BEGIN
    SELECT extensions.http_post(
      url := _url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(_service_key, '')
      ),
      body := jsonb_build_object('mode', 'allocate_donation', 'donationId', _donation_id)
    ) INTO _request_id;
  EXCEPTION WHEN OTHERS THEN
    -- pg_net not available or call failed; return marker so caller can fall back to client-side invoke
    RETURN jsonb_build_object('success', false, 'reason', 'pg_net_unavailable', 'error', SQLERRM);
  END;

  RETURN jsonb_build_object('success', true, 'request_id', _request_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_allocate_donation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_allocate_donation(uuid) TO authenticated, service_role;

-- =========================================================
-- Trigger: auto-allocate completed donations
-- =========================================================
CREATE OR REPLACE FUNCTION public.trg_auto_allocate_donation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _auto boolean;
  _settings jsonb;
BEGIN
  -- Skip if no donor account linked yet (allocation needs a donor pool)
  IF NEW.donor_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only fire for completed donations
  IF COALESCE(NEW.status, '') NOT IN ('completed','succeeded','success') THEN
    RETURN NEW;
  END IF;

  -- Read org setting; default true
  SELECT settings INTO _settings FROM public.organizations WHERE id = NEW.organization_id;
  _auto := COALESCE((_settings ->> 'auto_allocate_donations')::boolean, true);
  IF NOT _auto THEN
    RETURN NEW;
  END IF;

  -- Best-effort async dispatch; swallow errors so the donation insert never fails
  BEGIN
    PERFORM public.rpc_allocate_donation(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'auto-allocate failed for donation %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donations_auto_allocate ON public.donations;
CREATE TRIGGER trg_donations_auto_allocate
  AFTER INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_allocate_donation();

-- Also re-fire when a donation transitions to completed
CREATE OR REPLACE FUNCTION public.trg_auto_allocate_donation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.donor_account_id IS NOT NULL
     AND COALESCE(NEW.status,'') IN ('completed','succeeded','success')
     AND COALESCE(OLD.status,'') NOT IN ('completed','succeeded','success') THEN
    PERFORM public.trg_auto_allocate_donation();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donations_auto_allocate_update ON public.donations;
CREATE TRIGGER trg_donations_auto_allocate_update
  AFTER UPDATE OF status, donor_account_id ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_allocate_donation();

NOTIFY pgrst, 'reload schema';
