REVOKE ALL ON public.departments, public.department_members, public.department_programmes FROM anon;
NOTIFY pgrst, 'reload schema';