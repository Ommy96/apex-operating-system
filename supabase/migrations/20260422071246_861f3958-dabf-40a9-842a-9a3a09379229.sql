DROP POLICY IF EXISTS "Service role inserts runs" ON public.analytics_report_runs;

CREATE POLICY "Org members insert runs"
ON public.analytics_report_runs FOR INSERT
WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));