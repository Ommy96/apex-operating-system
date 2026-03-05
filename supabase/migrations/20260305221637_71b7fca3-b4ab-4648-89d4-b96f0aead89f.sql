-- Grant admin role to the super admin user
INSERT INTO public.user_roles (user_id, role, granted_at)
VALUES ('a41398f1-6ba3-4ebb-899f-6f25aa45748e', 'admin', now())
ON CONFLICT (user_id, role) DO NOTHING;
