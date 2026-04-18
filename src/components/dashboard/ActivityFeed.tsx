import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { formatDistanceToNow } from "date-fns";
import { Activity, UserPlus, Target, DollarSign, FileText, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBeneficiaryTerminology } from "@/hooks/useBeneficiaryTerminology";

interface ActivityItem {
  id: string;
  icon: React.ElementType;
  message: string;
  time: string;
  color: string;
}

export function ActivityFeed() {
  const { currentOrganization } = useOrganization();
  const { term, termLower } = useBeneficiaryTerminology();
  const orgId = currentOrganization?.organization_id;

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["dashboard-activity-feed", orgId],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!orgId) return [];

      const [recentBeneficiaries, recentEnrollments, recentDonors] = await Promise.all([
        supabase
          .from("beneficiaries")
          .select("id, display_name, created_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("beneficiary_services")
          .select("id, created_at, program_id, beneficiary_id, beneficiaries(display_name), programs(name)")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("beneficiary_donors")
          .select("id, donor_name, amount_received, created_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const items: ActivityItem[] = [];

      (recentBeneficiaries.data || []).forEach((b) => {
        items.push({
          id: `b-${b.id}`,
          icon: UserPlus,
          message: `${term} ${b.display_name} was added`,
          time: b.created_at,
          color: "text-primary",
        });
      });

      (recentEnrollments.data || []).forEach((e: any) => {
        const bName = e.beneficiaries?.display_name || `A ${termLower}`;
        const pName = e.programs?.name || "a program";
        items.push({
          id: `e-${e.id}`,
          icon: Target,
          message: `${bName} enrolled in ${pName}`,
          time: e.created_at,
          color: "text-accent",
        });
      });

      (recentDonors.data || []).forEach((d) => {
        const amount = d.amount_received ? ` ($${d.amount_received.toLocaleString()})` : "";
        items.push({
          id: `d-${d.id}`,
          icon: DollarSign,
          message: `Donation recorded from ${d.donor_name}${amount}`,
          time: d.created_at,
          color: "text-success",
        });
      });

      return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);
    },
    enabled: !!orgId,
    staleTime: 15000,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[320px]">
      <div className="space-y-1">
        {activities.map((item) => (
          <div key={item.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
            <div className={`mt-0.5 ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground leading-snug">{item.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
