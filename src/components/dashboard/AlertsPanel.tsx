import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, AlertCircle, Info, Loader2, Bell } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: "warning" | "critical" | "info";
  link?: string;
}

export function AlertsPanel() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const navigate = useNavigate();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["dashboard-alerts", orgId],
    queryFn: async (): Promise<AlertItem[]> => {
      if (!orgId) return [];

      const items: AlertItem[] = [];

      // Check for unfunded beneficiaries (no donors)
      const { count: unfundedCount } = await supabase
        .from("beneficiaries")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "active")
        .is("deleted_at", null);

      const { count: fundedCount } = await supabase
        .from("beneficiary_donors")
        .select("beneficiary_id", { count: "exact", head: true })
        .eq("organization_id", orgId);

      const unfunded = (unfundedCount || 0) - (fundedCount || 0);
      if (unfunded > 0) {
        items.push({
          id: "unfunded",
          title: `${unfunded} beneficiaries unfunded`,
          message: "These beneficiaries have no sponsor/donor linked",
          severity: "warning",
          link: "/beneficiaries",
        });
      }

      // Check for unresolved alert instances
      const { data: alertInstances } = await supabase
        .from("alert_instances")
        .select("id, title, message, severity")
        .eq("organization_id", orgId)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(5);

      (alertInstances || []).forEach((a) => {
        items.push({
          id: a.id,
          title: a.title,
          message: a.message,
          severity: a.severity === "critical" ? "critical" : a.severity === "warning" ? "warning" : "info",
        });
      });

      return items;
    },
    enabled: !!orgId,
    staleTime: 60000,
  });

  const severityConfig = {
    critical: { icon: AlertCircle, bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
    warning: { icon: AlertTriangle, bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" },
    info: { icon: Info, bg: "bg-info/10", text: "text-info", border: "border-info/20" },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Bell className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No active alerts</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[320px]">
      <div className="space-y-2">
        {alerts.map((alert) => {
          const cfg = severityConfig[alert.severity];
          return (
            <button
              key={alert.id}
              onClick={() => alert.link && navigate(alert.link)}
              className={`w-full text-left p-3 rounded-lg border ${cfg.border} ${cfg.bg} hover:opacity-90 transition-opacity`}
            >
              <div className="flex items-start gap-2.5">
                <cfg.icon className={`h-4 w-4 mt-0.5 ${cfg.text} shrink-0`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${cfg.text}`}>{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
