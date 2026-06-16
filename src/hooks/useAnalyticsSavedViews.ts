import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { AnalyticsQuestion } from "@/lib/analyticsConfig";

export interface SavedView {
  id: string;
  name: string;
  params: AnalyticsQuestion;
  created_at: string;
}

export function useAnalyticsSavedViews() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["analytics-saved-views", orgId, user?.id],
    queryFn: async (): Promise<SavedView[]> => {
      if (!orgId || !user) return [];
      const { data, error } = await supabase
        .from("analytics_saved_views" as any)
        .select("id, name, params, created_at")
        .eq("user_id", user.id)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedView[];
    },
    enabled: !!orgId && !!user,
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async ({ name, question }: { name: string; question: AnalyticsQuestion }) => {
      if (!orgId || !user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("analytics_saved_views" as any)
        .insert({ name, params: question as any, user_id: user.id, organization_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analytics-saved-views"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("analytics_saved_views" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analytics-saved-views"] }),
  });

  return { savedViews: list.data ?? [], isLoading: list.isLoading, save, remove };
}