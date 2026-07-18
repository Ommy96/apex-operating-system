import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

const sb = supabase as any;

export interface PackageItem {
  id: string;
  package_id: string;
  organization_id: string;
  item_type: string;
  item_label: string;
  cost: number;
  sort_order: number;
}

export interface SponsorshipPackage {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  monthly_cost: number;
  currency: string;
  active: boolean;
  items?: PackageItem[];
}

export const ITEM_TYPES = [
  { value: "school_fees", label: "School fees" },
  { value: "transport", label: "Transport" },
  { value: "medical", label: "Medical" },
  { value: "mentorship", label: "Mentorship" },
  { value: "shopping", label: "Shopping" },
  { value: "food", label: "Food" },
  { value: "uniform", label: "Uniform" },
  { value: "stationery", label: "Stationery" },
  { value: "other", label: "Other" },
];

export function useSponsorshipPackages() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    enabled: !!orgId,
    queryKey: ["sponsorship-packages", orgId],
    queryFn: async (): Promise<SponsorshipPackage[]> => {
      const { data: packages, error } = await sb
        .from("sponsorship_packages")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (packages || []).map((p: any) => p.id);
      let items: any[] = [];
      if (ids.length) {
        const { data: it } = await sb
          .from("sponsorship_package_items")
          .select("*")
          .in("package_id", ids)
          .order("sort_order", { ascending: true });
        items = it || [];
      }
      return (packages || []).map((p: any) => ({
        ...p,
        items: items.filter((i) => i.package_id === p.id),
      }));
    },
  });
}

export function usePackageWithItems(packageId?: string) {
  return useQuery({
    enabled: !!packageId,
    queryKey: ["sponsorship-package", packageId],
    queryFn: async (): Promise<SponsorshipPackage | null> => {
      const { data: pkg, error } = await sb
        .from("sponsorship_packages")
        .select("*")
        .eq("id", packageId)
        .maybeSingle();
      if (error) throw error;
      if (!pkg) return null;
      const { data: items } = await sb
        .from("sponsorship_package_items")
        .select("*")
        .eq("package_id", packageId)
        .order("sort_order", { ascending: true });
      return { ...pkg, items: items || [] };
    },
  });
}

export function useUpsertPackage() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (input: Partial<SponsorshipPackage> & { id?: string }) => {
      const orgId = currentOrganization?.organization_id;
      const { items, ...rest } = input as any;
      const payload = { ...rest, organization_id: orgId };
      const { data, error } = await sb
        .from("sponsorship_packages")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsorship-packages"] });
      toast.success("Package saved");
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });
}

export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sponsorship_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsorship-packages"] });
      toast.success("Package deleted");
    },
  });
}

export function useUpsertPackageItem() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (input: Partial<PackageItem> & { id?: string; package_id: string }) => {
      const orgId = currentOrganization?.organization_id;
      const payload = { ...input, organization_id: orgId };
      const { data, error } = await sb
        .from("sponsorship_package_items")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sponsorship-packages"] });
      qc.invalidateQueries({ queryKey: ["sponsorship-package", vars.package_id] });
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });
}

export function useDeletePackageItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("sponsorship_package_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsorship-packages"] }),
  });
}

/** Recompute a package's monthly_cost from its items and persist. */
export async function syncPackageCostFromItems(packageId: string) {
  const { data: items } = await sb
    .from("sponsorship_package_items")
    .select("cost")
    .eq("package_id", packageId);
  const total = (items || []).reduce((s: number, i: any) => s + Number(i.cost || 0), 0);
  await sb.from("sponsorship_packages").update({ monthly_cost: total }).eq("id", packageId);
  return total;
}