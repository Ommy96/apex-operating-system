import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { HandCoins } from "lucide-react";

export function NeedsGapCard() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const { data, isLoading } = useQuery({
    enabled: !!orgId,
    queryKey: ["unmet-needs-gap", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_unmet_needs_gap")
        .select("*")
        .eq("organization_id", orgId);
      if (error) throw error;
      return (data ?? []) as Array<{
        need_label: string;
        estimated_cost: number;
        currency: string;
        status: string;
        beneficiary_id: string;
      }>;
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const rows = data ?? [];
  if (rows.length === 0) return null;

  const byNeed = new Map<string, { count: number; total: number }>();
  rows.forEach((r) => {
    const cur = byNeed.get(r.need_label) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(r.estimated_cost ?? 0);
    byNeed.set(r.need_label, cur);
  });
  const total = rows.reduce((s, r) => s + Number(r.estimated_cost ?? 0), 0);

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-primary" />
          Funding gap: unmet needs
          <Badge variant="secondary" className="ml-2">{rows.length}</Badge>
        </CardTitle>
        <CardDescription>
          KSh {total.toLocaleString()} across {rows.length} unmet need{rows.length !== 1 ? "s" : ""} — sponsor a specific need to close the gap.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {[...byNeed.entries()]
          .sort((a, b) => b[1].total - a[1].total)
          .map(([label, v]) => (
            <div key={label} className="rounded-md border bg-background px-3 py-2 text-sm">
              <div className="font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">
                {v.count} unmet · KSh {v.total.toLocaleString()}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}