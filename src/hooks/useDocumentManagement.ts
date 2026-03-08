import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export interface ManagedDocument {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  current_version: number;
  current_file_url: string | null;
  current_file_name: string | null;
  current_file_size: number | null;
  current_file_type: string | null;
  status: string;
  access_level: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  change_notes: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface DocumentAccessLog {
  id: string;
  document_id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  metadata: any;
  created_at: string;
}

export function useDocumentManagement() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  // Fetch all documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ["managed-documents", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("managed_documents")
        .select("*")
        .eq("organization_id", orgId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as ManagedDocument[];
    },
    enabled: !!orgId,
  });

  // Fetch versions for a document
  const fetchVersions = async (documentId: string) => {
    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_id", documentId)
      .order("version_number", { ascending: false });
    if (error) throw error;
    return data as DocumentVersion[];
  };

  // Fetch access logs for a document
  const fetchAccessLogs = async (documentId: string) => {
    if (!orgId) return [];
    const { data, error } = await supabase
      .from("document_access_logs")
      .select("*")
      .eq("document_id", documentId)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data as DocumentAccessLog[];
  };

  // Log access
  const logAccess = async (documentId: string, action: string, metadata?: any) => {
    if (!orgId || !user) return;
    await supabase.from("document_access_logs").insert({
      document_id: documentId,
      organization_id: orgId,
      user_id: user.id,
      action,
      metadata: metadata || {},
    });
  };

  // Upload file to storage
  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from("managed-documents")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    return data.path;
  };

  // Get download URL
  const getDownloadUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("managed-documents")
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  // Create document
  const createDocument = useMutation({
    mutationFn: async ({
      title,
      description,
      category,
      tags,
      file,
      donor_visible,
      document_type,
    }: {
      title: string;
      description?: string;
      category: string;
      tags?: string[];
      file: File;
      donor_visible?: boolean;
      document_type?: string;
    }) => {
      if (!orgId || !user) throw new Error("Not authenticated");

      const filePath = `${orgId}/${crypto.randomUUID()}/${file.name}`;
      await uploadFile(file, filePath);

      const { data: doc, error: docError } = await supabase
        .from("managed_documents")
        .insert({
          organization_id: orgId,
          title,
          description: description || null,
          category,
          tags: tags || [],
          current_version: 1,
          current_file_url: filePath,
          current_file_name: file.name,
          current_file_size: file.size,
          current_file_type: file.type,
          created_by: user.id,
          updated_by: user.id,
          donor_visible: donor_visible || false,
          document_type: document_type || 'general',
        } as any)
        .select()
        .single();
      if (docError) throw docError;

      // Create version 1
      await supabase.from("document_versions").insert({
        document_id: doc.id,
        version_number: 1,
        file_url: filePath,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        change_notes: "Initial upload",
        uploaded_by: user.id,
      });

      await logAccess(doc.id, "created");
      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-documents"] });
      toast.success("Document uploaded successfully");
    },
    onError: (e: any) => toast.error(e.message || "Failed to upload document"),
  });

  // Upload new version
  const uploadVersion = useMutation({
    mutationFn: async ({
      documentId,
      file,
      changeNotes,
    }: {
      documentId: string;
      file: File;
      changeNotes?: string;
    }) => {
      if (!orgId || !user) throw new Error("Not authenticated");

      // Get current version
      const { data: doc } = await supabase
        .from("managed_documents")
        .select("current_version")
        .eq("id", documentId)
        .single();
      if (!doc) throw new Error("Document not found");

      const newVersion = doc.current_version + 1;
      const filePath = `${orgId}/${crypto.randomUUID()}/${file.name}`;
      await uploadFile(file, filePath);

      // Create version record
      await supabase.from("document_versions").insert({
        document_id: documentId,
        version_number: newVersion,
        file_url: filePath,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        change_notes: changeNotes || null,
        uploaded_by: user.id,
      });

      // Update document
      await supabase
        .from("managed_documents")
        .update({
          current_version: newVersion,
          current_file_url: filePath,
          current_file_name: file.name,
          current_file_size: file.size,
          current_file_type: file.type,
          updated_by: user.id,
        })
        .eq("id", documentId);

      await logAccess(documentId, "new_version", { version: newVersion });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-documents"] });
      toast.success("New version uploaded");
    },
    onError: (e: any) => toast.error(e.message || "Failed to upload version"),
  });

  // Delete document
  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      if (!orgId) throw new Error("No organization");
      await logAccess(documentId, "deleted");
      const { error } = await supabase
        .from("managed_documents")
        .delete()
        .eq("id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-documents"] });
      toast.success("Document deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete document"),
  });

  // Update document metadata
  const updateDocument = useMutation({
    mutationFn: async ({
      id,
      title,
      description,
      category,
      tags,
      status,
      donor_visible,
      document_type,
    }: {
      id: string;
      title?: string;
      description?: string;
      category?: string;
      tags?: string[];
      status?: string;
      donor_visible?: boolean;
      document_type?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const updates: any = { updated_by: user.id };
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (category !== undefined) updates.category = category;
      if (tags !== undefined) updates.tags = tags;
      if (status !== undefined) updates.status = status;
      if (donor_visible !== undefined) updates.donor_visible = donor_visible;
      if (document_type !== undefined) updates.document_type = document_type;

      const { error } = await supabase
        .from("managed_documents")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      await logAccess(id, "updated", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-documents"] });
      toast.success("Document updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update document"),
  });

  // Real-time subscriptions
  useRealtimeSubscription([
    { table: "managed_documents", queryKeys: [["managed-documents", orgId || ""]], orgId, enabled: !!orgId },
  ]);

  return {
    documents: documents || [],
    isLoading,
    createDocument,
    uploadVersion,
    deleteDocument,
    updateDocument,
    fetchVersions,
    fetchAccessLogs,
    getDownloadUrl,
    logAccess,
  };
}
