import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

const sb = supabase as any;

export type FormFieldType =
  | "text" | "number" | "decimal" | "date" | "datetime"
  | "select" | "multiselect" | "boolean" | "photo"
  | "document" | "beneficiary_link" | "location"
  | "scale" | "calculated" | "section_header";

export interface MEForm {
  id: string;
  organization_id: string;
  program_id: string | null;
  project_id: string | null;
  name: string;
  description: string | null;
  form_purpose: string | null;
  version: number;
  status: "draft" | "active" | "retired";
  deployed_to_roles: string[] | null;
  requires_beneficiary_link: boolean;
  requires_location: boolean;
  requires_photo: boolean;
  allow_offline: boolean;
  created_by: string | null;
  updated_by: string | null;
  published_at: string | null;
  retired_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MEFormField {
  id: string;
  organization_id: string;
  form_id: string;
  field_label: string;
  field_key: string;
  field_type: FormFieldType;
  field_options: any;
  is_required: boolean;
  validation_rule: string | null;
  helper_text: string | null;
  linked_indicator_id: string | null;
  maps_to_column: string | null;
  display_order: number;
  depends_on_field_id: string | null;
  depends_on_value: string | null;
  created_at: string;
  updated_at: string;
}

export interface MEFormSubmission {
  id: string;
  form_id: string;
  organization_id: string;
  submitted_by: string | null;
  submission_date: string;
  beneficiary_ids: string[] | null;
  household_id: string | null;
  location_county: string | null;
  location_sub_county: string | null;
  data: Record<string, any>;
  data_quality_flags: string[] | null;
  is_synced: boolean;
  created_at: string;
}

export function useMEForms() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ["me-forms", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<MEForm[]> => {
      const { data, error } = await sb
        .from("me_forms")
        .select("*")
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMEForm(id: string | undefined) {
  return useQuery({
    queryKey: ["me-form", id],
    enabled: !!id,
    queryFn: async (): Promise<MEForm | null> => {
      const { data, error } = await sb.from("me_forms").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMEFormFields(formId: string | undefined) {
  return useQuery({
    queryKey: ["me-form-fields", formId],
    enabled: !!formId,
    queryFn: async (): Promise<MEFormField[]> => {
      const { data, error } = await sb
        .from("me_form_fields")
        .select("*")
        .eq("form_id", formId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMEFormSubmissions(formId: string | undefined) {
  return useQuery({
    queryKey: ["me-form-submissions", formId],
    enabled: !!formId,
    queryFn: async (): Promise<MEFormSubmission[]> => {
      const { data, error } = await sb
        .from("me_form_submissions")
        .select("*")
        .eq("form_id", formId)
        .is("deleted_at", null)
        .order("submission_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateForm() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<MEForm>) => {
      const orgId = currentOrganization?.organization_id;
      if (!orgId) throw new Error("No organisation");
      const { data, error } = await sb
        .from("me_forms")
        .insert({
          organization_id: orgId,
          name: input.name ?? "Untitled form",
          description: input.description ?? null,
          form_purpose: input.form_purpose ?? null,
          status: "draft",
          version: 1,
          requires_beneficiary_link: input.requires_beneficiary_link ?? false,
          requires_location: input.requires_location ?? false,
          requires_photo: input.requires_photo ?? false,
          allow_offline: input.allow_offline ?? true,
          program_id: input.program_id ?? null,
          project_id: input.project_id ?? null,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MEForm;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me-forms"] });
      toast({ title: "Form created" });
    },
    onError: (e: any) => toast({ title: "Failed to create form", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateForm() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<MEForm> }) => {
      const upd: any = { ...patch, updated_by: user?.id ?? null };
      if (patch.status === "active" && !patch.published_at) upd.published_at = new Date().toISOString();
      if (patch.status === "retired" && !patch.retired_at) upd.retired_at = new Date().toISOString();
      const { data, error } = await sb.from("me_forms").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["me-form", vars.id] });
      qc.invalidateQueries({ queryKey: ["me-forms"] });
      toast({ title: "Form updated" });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteForm() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from("me_forms")
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me-forms"] });
      toast({ title: "Form deleted" });
    },
  });
}

export function useUpsertFormField() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (field: Partial<MEFormField> & { form_id: string }) => {
      const orgId = currentOrganization?.organization_id;
      if (!orgId) throw new Error("No organisation");
      const payload: any = { ...field, organization_id: orgId };
      if (field.id) {
        const { data, error } = await sb.from("me_form_fields").update(payload).eq("id", field.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await sb.from("me_form_fields").insert(payload).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["me-form-fields", vars.form_id] }),
    onError: (e: any) => toast({ title: "Save field failed", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteFormField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, formId: _f }: { id: string; formId: string }) => {
      const { error } = await sb.from("me_form_fields").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["me-form-fields", vars.formId] }),
  });
}

export function useReorderFormFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ formId, ordered }: { formId: string; ordered: { id: string; display_order: number }[] }) => {
      // Sequential updates — list is small
      for (const o of ordered) {
        await sb.from("me_form_fields").update({ display_order: o.display_order }).eq("id", o.id);
      }
      return { formId };
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["me-form-fields", vars.formId] }),
  });
}