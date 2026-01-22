-- Tighten overly permissive INSERT policies flagged by the linter.
-- These tables are operational logs and should not accept anonymous inserts.

DO $$
BEGIN
  -- api_usage_logs
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='api_usage_logs'
      AND policyname='System can insert API logs'
  ) THEN
    EXECUTE 'DROP POLICY "System can insert API logs" ON public.api_usage_logs';
  END IF;

  -- system_health_logs
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='system_health_logs'
      AND policyname='System can insert health logs'
  ) THEN
    EXECUTE 'DROP POLICY "System can insert health logs" ON public.system_health_logs';
  END IF;
END $$;

-- Recreate with authenticated-only inserts.
CREATE POLICY "Authenticated can insert API logs"
ON public.api_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert health logs"
ON public.system_health_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
