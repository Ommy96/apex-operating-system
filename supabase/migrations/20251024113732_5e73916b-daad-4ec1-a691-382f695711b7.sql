-- Critical Security Fix: Implement Separate User Roles Table
-- This addresses the privilege escalation vulnerability

-- 1. Create dedicated user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role user_role NOT NULL,
    granted_at timestamp with time zone DEFAULT now(),
    granted_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create strict RLS policies for user_roles (only admins can modify)
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'::user_role
    )
);

CREATE POLICY "Admins can insert user roles"
ON public.user_roles FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'::user_role
    )
);

CREATE POLICY "Admins can update user roles"
ON public.user_roles FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'::user_role
    )
);

CREATE POLICY "Admins can delete user roles"
ON public.user_roles FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'::user_role
    )
);

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- 3. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, granted_at, granted_by)
SELECT user_id, role, created_at, NULL
FROM public.profiles
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = profiles.user_id
    AND user_roles.role = profiles.role
);

-- 4. Create improved get_user_role function that uses user_roles table
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- First check user_roles table (primary source)
    SELECT role
    FROM public.user_roles
    WHERE user_roles.user_id = $1
    ORDER BY CASE role
        WHEN 'admin' THEN 1
        WHEN 'management' THEN 2
        WHEN 'staff' THEN 3
        ELSE 4
    END
    LIMIT 1;
$$;

-- 5. Create helper function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    );
$$;

-- 6. Fix children table RLS - Remove overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view children" ON public.children;

-- Create role-based policies for children table
CREATE POLICY "Staff and above can view basic child info"
ON public.children FOR SELECT
USING (
    get_user_role(auth.uid()) IN ('admin'::user_role, 'management'::user_role, 'staff'::user_role)
);

-- 7. Add audit trigger for user_roles changes
CREATE OR REPLACE FUNCTION audit_user_role_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            event_type,
            entity_type,
            entity_id,
            user_id,
            new_values,
            metadata
        ) VALUES (
            'role_granted',
            'user_roles',
            NEW.id,
            NEW.granted_by,
            to_jsonb(NEW),
            jsonb_build_object('target_user_id', NEW.user_id, 'role', NEW.role)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            event_type,
            entity_type,
            entity_id,
            user_id,
            old_values,
            metadata
        ) VALUES (
            'role_revoked',
            'user_roles',
            OLD.id,
            auth.uid(),
            to_jsonb(OLD),
            jsonb_build_object('target_user_id', OLD.user_id, 'role', OLD.role)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER user_roles_audit_trigger
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION audit_user_role_changes();

-- 8. Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 9. Add comment to profiles.role column noting it's deprecated
COMMENT ON COLUMN public.profiles.role IS 'DEPRECATED: Use user_roles table instead. Kept for backward compatibility only.';