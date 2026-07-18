
-- Drop existing overly-broad policies
DROP POLICY IF EXISTS "Admins can manage documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update child photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete managed documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update managed documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload child photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload managed documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view managed documents" ON storage.objects;
DROP POLICY IF EXISTS "Child photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload compliance docs" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view compliance docs" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can delete beneficiary photos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can update beneficiary photos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can upload beneficiary photos" ON storage.objects;
DROP POLICY IF EXISTS "beneficiary photos publicly readable" ON storage.objects;

-- Helper predicate: first path segment must be an org the user belongs to.
-- We inline the check via user_belongs_to_org(auth.uid(), (storage.foldername(name))[1]::uuid).

-- CHILD PHOTOS (private, org-scoped) ---------------------------------------
CREATE POLICY "child-photos org read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'child-photos'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "child-photos org insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'child-photos'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "child-photos org update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'child-photos'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'child-photos'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "child-photos org delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'child-photos'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- BENEFICIARY PHOTOS (private, org-scoped) ---------------------------------
CREATE POLICY "beneficiary-photos org read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'beneficiary-photos'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "beneficiary-photos org insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'beneficiary-photos'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "beneficiary-photos org update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'beneficiary-photos'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'beneficiary-photos'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "beneficiary-photos org delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'beneficiary-photos'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- DOCUMENTS (private, org-scoped) ------------------------------------------
CREATE POLICY "documents org read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "documents org insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "documents org update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "documents org delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- MANAGED-DOCUMENTS (private, org-scoped) ----------------------------------
CREATE POLICY "managed-documents org read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'managed-documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "managed-documents org insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'managed-documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "managed-documents org update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'managed-documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'managed-documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "managed-documents org delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'managed-documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- RECEIPTS (private, org-scoped) -------------------------------------------
CREATE POLICY "receipts org read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "receipts org insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "receipts org update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "receipts org delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- COMPLIANCE-DOCS (private, org-scoped) ------------------------------------
CREATE POLICY "compliance-docs org read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'compliance-docs'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "compliance-docs org insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'compliance-docs'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "compliance-docs org update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'compliance-docs'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'compliance-docs'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "compliance-docs org delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'compliance-docs'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- POLICY-DOCUMENTS (private, org-scoped) -----------------------------------
CREATE POLICY "policy-documents org read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'policy-documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "policy-documents org insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'policy-documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "policy-documents org update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'policy-documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'policy-documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "policy-documents org delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'policy-documents'
    AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
