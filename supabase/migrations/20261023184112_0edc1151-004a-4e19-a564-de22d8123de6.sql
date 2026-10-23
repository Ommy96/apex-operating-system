REVOKE ALL ON public.vulnerability_categories, public.vulnerability_assessments FROM anon;
NOTIFY pgrst, 'reload schema';