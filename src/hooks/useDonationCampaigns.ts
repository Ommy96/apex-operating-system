import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface DonationCampaign {
  id: string;
  organization_id: string;
  slug: string;
  title: string;
  story: string | null;
  image_url: string | null;
  target_amount: number;
  currency: string;
  status: string;
  program_id: string | null;
  project_id: string | null;
  beneficiary_id: string | null;
  raised_amount: number;
  donor_count: number;
  end_date: string | null;
  created_at: string;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function useDonationCampaigns() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["donation-campaigns", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_campaigns" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DonationCampaign[];
    },
    enabled: !!orgId,
  });

  const create = useMutation({
    mutationFn: async (payload: Partial<DonationCampaign> & { title: string }) => {
      if (!orgId) throw new Error("No organization");
      const slug = payload.slug || slugify(payload.title);
      const { data, error } = await supabase
        .from("donation_campaigns" as any)
        .insert({
          organization_id: orgId,
          slug,
          title: payload.title,
          story: payload.story ?? null,
          image_url: payload.image_url ?? null,
          target_amount: payload.target_amount ?? 0,
          currency: payload.currency ?? "KES",
          status: payload.status ?? "active",
          program_id: payload.program_id ?? null,
          project_id: payload.project_id ?? null,
          beneficiary_id: payload.beneficiary_id ?? null,
          end_date: payload.end_date ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DonationCampaign;
    },
    onSuccess: () => {
      toast.success("Campaign created");
      qc.invalidateQueries({ queryKey: ["donation-campaigns", orgId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to create campaign"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DonationCampaign> & { id: string }) => {
      const { error } = await supabase
        .from("donation_campaigns" as any)
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign updated");
      qc.invalidateQueries({ queryKey: ["donation-campaigns", orgId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("donation_campaigns" as any)
        .update({ deleted_at: new Date().toISOString(), status: "closed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign archived");
      qc.invalidateQueries({ queryKey: ["donation-campaigns", orgId] });
    },
  });

  return { list, create, update, remove };
}

export function useCampaignDonations(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-donations", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations" as any)
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });
}