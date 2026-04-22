import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "@/hooks/use-toast";

export interface AnalyticsSubscription {
  id: string;
  organization_id: string;
  name: string;
  recipients: string[];
  frequency: "weekly" | "monthly" | "quarterly";
  tab: string;
  is_active: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
  created_at: string;
}

function nextSendDate(frequency: "weekly" | "monthly" | "quarterly"): string {
  const d = new Date();
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setMonth(d.getMonth() + 3);
  return d.toISOString();
}

export function useAnalyticsSubscriptions() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["analytics-subscriptions", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_report_subscriptions")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AnalyticsSubscription[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      name: string;
      recipients: string[];
      frequency: "weekly" | "monthly" | "quarterly";
      tab: string;
    }) => {
      if (!orgId) throw new Error("No organization");
      const { error } = await supabase.from("analytics_report_subscriptions").insert({
        organization_id: orgId,
        name: input.name,
        recipients: input.recipients,
        frequency: input.frequency,
        tab: input.tab,
        is_active: true,
        next_send_at: nextSendDate(input.frequency),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analytics-subscriptions", orgId] });
      toast({ title: "Schedule created" });
    },
    onError: (e) =>
      toast({
        title: "Could not save schedule",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("analytics_report_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analytics-subscriptions", orgId] });
      toast({ title: "Schedule removed" });
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("analytics_report_subscriptions")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analytics-subscriptions", orgId] }),
  });

  const sendNow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("send-analytics-snapshot", {
        body: { subscription_id: id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analytics-subscriptions", orgId] });
      toast({ title: "Snapshot sent" });
    },
    onError: (e) =>
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Unable to send snapshot",
        variant: "destructive",
      }),
  });

  return { list, create, remove, toggle, sendNow };
}