-- Remove the default "Heart to Heart" org auto-assignment on sign-up.
-- New users will no longer be forced into organization_id = a000...0001.
-- They will be linked to an organization during the organization onboarding flow instead.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Create profile (no default organization)
  INSERT INTO public.profiles (user_id, full_name, email, role, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'staff',
    NULL
  );

  -- Add default staff role to user_roles
  INSERT INTO public.user_roles (user_id, role, granted_at)
  VALUES (
    NEW.id,
    'staff',
    now()
  );

  RETURN NEW;
END;
$function$;
