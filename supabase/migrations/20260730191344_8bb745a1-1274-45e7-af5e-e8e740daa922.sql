CREATE POLICY "beneficiary-documents org read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'beneficiary-documents' AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "beneficiary-documents org insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'beneficiary-documents' AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "beneficiary-documents org update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'beneficiary-documents' AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'beneficiary-documents' AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "beneficiary-documents org delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'beneficiary-documents' AND public.user_belongs_to_org(auth.uid(), ((storage.foldername(name))[1])::uuid));
NOTIFY pgrst, 'reload schema';