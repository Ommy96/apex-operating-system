
-- Document Management System

-- Main documents table (metadata + latest version tracking)
CREATE TABLE public.managed_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  current_version INTEGER NOT NULL DEFAULT 1,
  current_file_url TEXT,
  current_file_name TEXT,
  current_file_size BIGINT,
  current_file_type TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  access_level TEXT NOT NULL DEFAULT 'organization',
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document versions table (full version history)
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.managed_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  change_notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);

-- Document access logs (audit trail)
CREATE TABLE public.document_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.managed_documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_managed_documents_org ON public.managed_documents(organization_id);
CREATE INDEX idx_managed_documents_category ON public.managed_documents(category);
CREATE INDEX idx_managed_documents_status ON public.managed_documents(status);
CREATE INDEX idx_document_versions_doc ON public.document_versions(document_id);
CREATE INDEX idx_document_access_logs_doc ON public.document_access_logs(document_id);
CREATE INDEX idx_document_access_logs_org ON public.document_access_logs(organization_id);

-- Enable RLS
ALTER TABLE public.managed_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for managed_documents
CREATE POLICY "Users can view documents in their org"
  ON public.managed_documents FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert documents in their org"
  ON public.managed_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update documents in their org"
  ON public.managed_documents FOR UPDATE
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete documents in their org"
  ON public.managed_documents FOR DELETE
  TO authenticated
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
    AND public.get_org_member_role(auth.uid(), organization_id) IN ('admin', 'management', 'owner')
  );

-- RLS Policies for document_versions
CREATE POLICY "Users can view versions of docs in their org"
  ON public.document_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.managed_documents md
      WHERE md.id = document_id
      AND public.user_belongs_to_org(auth.uid(), md.organization_id)
    )
  );

CREATE POLICY "Users can insert versions for docs in their org"
  ON public.document_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.managed_documents md
      WHERE md.id = document_id
      AND public.user_belongs_to_org(auth.uid(), md.organization_id)
    )
  );

-- RLS Policies for document_access_logs
CREATE POLICY "Users can view access logs in their org"
  ON public.document_access_logs FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert access logs in their org"
  ON public.document_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_managed_documents_updated_at
  BEFORE UPDATE ON public.managed_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for managed documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('managed-documents', 'managed-documents', false, 20971520)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload managed documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'managed-documents');

CREATE POLICY "Authenticated users can view managed documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'managed-documents');

CREATE POLICY "Authenticated users can update managed documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'managed-documents');

CREATE POLICY "Authenticated users can delete managed documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'managed-documents');
