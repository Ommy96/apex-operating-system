-- Remove the super admin from ALL organizations (super admin should be platform-level, not a tenant member)
DO $$
DECLARE
  _super_uid uuid;
BEGIN
  SELECT p.user_id
    INTO _super_uid
  FROM public.profiles p
  WHERE lower(p.email) = lower('inferatechsolutions@gmail.com')
  LIMIT 1;

  IF _super_uid IS NOT NULL THEN
    -- Ensure profile has no org selected
    UPDATE public.profiles
    SET organization_id = NULL
    WHERE user_id = _super_uid;

    -- Remove any org memberships (including Heart to Heart)
    DELETE FROM public.organization_members
    WHERE user_id = _super_uid;
  END IF;
END $$;
