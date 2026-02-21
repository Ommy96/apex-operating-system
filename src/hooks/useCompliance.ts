import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ConsentRecord {
  id: string;
  organization_id: string;
  beneficiary_id: string | null;
  subject_name: string;
  subject_email: string | null;
  consent_type: string;
  consent_purpose: string;
  consent_given: boolean;
  consent_date: string | null;
  expiry_date: string | null;
  withdrawal_date: string | null;
  withdrawal_reason: string | null;
  evidence_url: string | null;
  recorded_by: string | null;
  status: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface RetentionPolicy {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  data_category: string;
  retention_period_days: number;
  action_on_expiry: string;
  is_active: boolean;
  last_executed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataAccessRequest {
  id: string;
  organization_id: string;
  request_type: string;
  subject_name: string;
  subject_email: string | null;
  subject_identifier: string | null;
  beneficiary_id: string | null;
  reason: string | null;
  status: string;
  priority: string;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  completed_at: string | null;
  due_date: string | null;
  data_exported: boolean;
  data_deleted: boolean;
  affected_tables: string[] | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface ComplianceExport {
  id: string;
  organization_id: string;
  export_type: string;
  exported_by: string | null;
  record_count: number;
  file_url: string | null;
  metadata: any;
  created_at: string;
}

export function useCompliance() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  // Consent records
  const { data: consents, isLoading: consentsLoading } = useQuery({
    queryKey: ["consent-records", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("consent_records")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ConsentRecord[];
    },
    enabled: !!orgId,
  });

  // Retention policies
  const { data: retentionPolicies, isLoading: retentionLoading } = useQuery({
    queryKey: ["retention-policies", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("data_retention_policies")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RetentionPolicy[];
    },
    enabled: !!orgId,
  });

  // Data access requests
  const { data: accessRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["data-access-requests", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("data_access_requests")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DataAccessRequest[];
    },
    enabled: !!orgId,
  });

  // Compliance exports
  const { data: exports, isLoading: exportsLoading } = useQuery({
    queryKey: ["compliance-exports", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("compliance_exports")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ComplianceExport[];
    },
    enabled: !!orgId,
  });

  // Create consent
  const createConsent = useMutation({
    mutationFn: async (input: {
      subject_name: string;
      subject_email?: string;
      beneficiary_id?: string;
      consent_type: string;
      consent_purpose: string;
      consent_given: boolean;
      consent_date?: string;
      expiry_date?: string;
    }) => {
      if (!orgId || !user) throw new Error("Not authenticated");
      const { error } = await supabase.from("consent_records").insert({
        organization_id: orgId,
        recorded_by: user.id,
        status: input.consent_given ? "active" : "declined",
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent-records"] });
      toast.success("Consent record created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Withdraw consent
  const withdrawConsent = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from("consent_records")
        .update({
          status: "withdrawn",
          consent_given: false,
          withdrawal_date: new Date().toISOString(),
          withdrawal_reason: reason || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent-records"] });
      toast.success("Consent withdrawn");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Create retention policy
  const createRetentionPolicy = useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      data_category: string;
      retention_period_days: number;
      action_on_expiry: string;
    }) => {
      if (!orgId || !user) throw new Error("Not authenticated");
      const { error } = await supabase.from("data_retention_policies").insert({
        organization_id: orgId,
        created_by: user.id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retention-policies"] });
      toast.success("Retention policy created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle retention policy
  const toggleRetentionPolicy = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("data_retention_policies")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retention-policies"] });
      toast.success("Policy updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Create data access request
  const createAccessRequest = useMutation({
    mutationFn: async (input: {
      request_type: string;
      subject_name: string;
      subject_email?: string;
      subject_identifier?: string;
      beneficiary_id?: string;
      reason?: string;
      priority?: string;
    }) => {
      if (!orgId || !user) throw new Error("Not authenticated");
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const { error } = await supabase.from("data_access_requests").insert({
        organization_id: orgId,
        requested_by: user.id,
        due_date: dueDate.toISOString(),
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-access-requests"] });
      toast.success("Data request submitted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Review data access request
  const reviewAccessRequest = useMutation({
    mutationFn: async ({
      id,
      status,
      reviewer_notes,
    }: {
      id: string;
      status: string;
      reviewer_notes?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const updates: any = {
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: reviewer_notes || null,
      };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from("data_access_requests")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-access-requests"] });
      toast.success("Request updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Log compliance export
  const logExport = useMutation({
    mutationFn: async (input: { export_type: string; record_count: number }) => {
      if (!orgId || !user) throw new Error("Not authenticated");
      const { error } = await supabase.from("compliance_exports").insert({
        organization_id: orgId,
        exported_by: user.id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-exports"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    consents: consents || [],
    consentsLoading,
    retentionPolicies: retentionPolicies || [],
    retentionLoading,
    accessRequests: accessRequests || [],
    requestsLoading,
    exports: exports || [],
    exportsLoading,
    createConsent,
    withdrawConsent,
    createRetentionPolicy,
    toggleRetentionPolicy,
    createAccessRequest,
    reviewAccessRequest,
    logExport,
  };
}
