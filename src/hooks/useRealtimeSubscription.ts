import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface RealtimeConfig {
  /** Supabase table name to subscribe to */
  table: string;
  /** React Query keys to invalidate when changes occur */
  queryKeys: string[][];
  /** Optional: filter by organization_id column */
  orgId?: string | null;
  /** Optional: filter by a custom column */
  filterColumn?: string;
  filterValue?: string;
  /** Whether the subscription is enabled */
  enabled?: boolean;
}

/**
 * Subscribe to Supabase real-time changes and auto-invalidate React Query caches.
 * This provides live data updates across all pages without manual refetching.
 */
export function useRealtimeSubscription(configs: RealtimeConfig[]) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const activeConfigs = configs.filter(c => c.enabled !== false);
    if (activeConfigs.length === 0) return;

    const channelName = `realtime_${activeConfigs.map(c => c.table).join("_")}_${Date.now()}`;
    let channel = supabase.channel(channelName);

    activeConfigs.forEach((config) => {
      const filter = config.orgId && config.filterColumn !== undefined
        ? `${config.filterColumn || "organization_id"}=eq.${config.orgId}`
        : config.orgId
        ? `organization_id=eq.${config.orgId}`
        : undefined;

      channel = channel.on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: config.table,
          ...(filter ? { filter } : {}),
        },
        () => {
          config.queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, JSON.stringify(configs.map(c => ({ t: c.table, o: c.orgId, e: c.enabled })))]);
}

/**
 * Convenience wrapper: subscribe to a single table and invalidate matching query keys.
 */
export function useRealtimeTable(
  table: string,
  queryKeys: string[][],
  orgId?: string | null,
  enabled = true
) {
  useRealtimeSubscription([{ table, queryKeys, orgId, enabled }]);
}
