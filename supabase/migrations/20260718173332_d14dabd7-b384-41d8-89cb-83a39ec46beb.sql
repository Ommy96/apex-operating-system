
-- audit_logs INSERT
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- api_usage_logs INSERT
DROP POLICY IF EXISTS "Authenticated can insert API logs" ON public.api_usage_logs;
CREATE POLICY "Users insert API logs for their org"
ON public.api_usage_logs FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid() OR user_id IS NULL)
  AND organization_id IS NOT NULL
  AND public.user_belongs_to_org(auth.uid(), organization_id)
);

-- documents INSERT
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON public.documents;
CREATE POLICY "Org members upload documents for their children"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = documents.child_id
      AND public.user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

-- donations INSERT (public path)
DROP POLICY IF EXISTS "Public can create pending donations" ON public.donations;
CREATE POLICY "Public can create pending donations"
ON public.donations FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND amount > 0
  AND organization_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.is_active = true)
);

-- financial_transactions DELETE - use has_role enum consistently
DROP POLICY IF EXISTS "Admin can delete financial transactions" ON public.financial_transactions;
CREATE POLICY "Admin can delete financial transactions"
ON public.financial_transactions FOR DELETE TO authenticated
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  AND public.has_role(auth.uid(), 'admin'::public.user_role)
);

-- complaints INSERT - add non-trivial validation
DROP POLICY IF EXISTS "Public can submit complaints" ON public.complaints;
CREATE POLICY "Public can submit complaints"
ON public.complaints FOR INSERT TO anon, authenticated
WITH CHECK (
  organization_id IS NOT NULL
  AND category IS NOT NULL AND length(btrim(category)) > 0
  AND description IS NOT NULL AND length(btrim(description)) >= 5
);

-- whistleblower_reports INSERT - add non-trivial validation
DROP POLICY IF EXISTS "Public can submit whistleblower reports" ON public.whistleblower_reports;
CREATE POLICY "Public can submit whistleblower reports"
ON public.whistleblower_reports FOR INSERT TO anon, authenticated
WITH CHECK (
  organization_id IS NOT NULL
  AND report_type IS NOT NULL AND length(btrim(report_type)) > 0
  AND description IS NOT NULL AND length(btrim(description)) >= 10
);
