ALTER TABLE public.staff_tasks DROP CONSTRAINT staff_tasks_related_record_type_allowed;
ALTER TABLE public.staff_tasks ADD CONSTRAINT staff_tasks_related_record_type_allowed CHECK(related_record_type IS NULL OR related_record_type IN('life_event','vulnerability_assessment','need','home_visit','school_visit','donor_request','reporting_obligation'));
ALTER TABLE public.staff_tasks DROP CONSTRAINT staff_tasks_source_record_type_allowed;
ALTER TABLE public.staff_tasks ADD CONSTRAINT staff_tasks_source_record_type_allowed CHECK(source_record_type IS NULL OR source_record_type IN('life_event','vulnerability_assessment','need','home_visit','school_visit','donor_request','reporting_obligation'));
ALTER FUNCTION public.guard_reporting_obligation() SECURITY DEFINER;
ALTER FUNCTION public.guard_reporting_obligation() SET SCHEMA app_private;
REVOKE ALL ON FUNCTION app_private.guard_reporting_obligation() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst, 'reload schema';