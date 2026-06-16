CREATE TABLE public.analytics_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  params jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_saved_views TO authenticated;
GRANT ALL ON public.analytics_saved_views TO service_role;

ALTER TABLE public.analytics_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own saved analytics views in their org"
  ON public.analytics_saved_views FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND public.user_belongs_to_org(auth.uid(), organization_id)
  );

CREATE POLICY "Users insert their own saved analytics views"
  ON public.analytics_saved_views FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_belongs_to_org(auth.uid(), organization_id)
  );

CREATE POLICY "Users update their own saved analytics views"
  ON public.analytics_saved_views FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete their own saved analytics views"
  ON public.analytics_saved_views FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_analytics_saved_views_user_org ON public.analytics_saved_views(user_id, organization_id);