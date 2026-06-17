import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FxChip } from "./FxChip";
import { formatMoney } from "@/lib/allocationEngine";
import { RedirectAllocationDialog } from "./RedirectAllocationDialog";
import { usePermissions } from "@/hooks/usePermissions";

interface Props { beneficiaryId: string; }

export function BeneficiarySponsorshipLive({ beneficiaryId }: Props) {
  const { can } = usePermissions();
  const isAdmin = (can as any)?.manageOrg ?? (can as any)?.viewFinancials ?? false;
  const [redirectAllocId, setRedirectAllocId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["beneficiary-sponsorships", beneficiaryId],
    enabled: !!beneficiaryId,
    queryFn: async () => {
      const { data } = await supabase
        .from("allocations")
        .select("*, donor_accounts:donor_account_id(id, donor_name)")
        .eq("beneficiary_id", beneficiaryId)
        .order("allocated_at", { ascending: false });
      return data ?? [];
    },
  });

  const rows = data ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; totalNative: Map<string, number>; totalBase: number; baseCur: string; lastAt: string; activeRows: any[] }>();
    for (const r of rows) {
      const id = r.donor_account_id;
      const name = r.donor_accounts?.donor_name ?? "Unknown donor";
      const e = map.get(id) ?? { name, totalNative: new Map(), totalBase: 0, baseCur: r.base_currency, lastAt: r.allocated_at, activeRows: [] };
      const prev = e.totalNative.get(r.native_currency) ?? 0;
      e.totalNative.set(r.native_currency, prev + Number(r.amount_native ?? 0));
      e.totalBase += Number(r.amount_base ?? 0);
      if (new Date(r.allocated_at) > new Date(e.lastAt)) e.lastAt = r.allocated_at;
      if (r.status === "active") e.activeRows.push(r);
      map.set(id, e);
    }
    return Array.from(map.entries());
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          Sponsorship
          <Badge variant="outline" className="text-[10px]">live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">No allocations received yet.</p>
        ) : (
          grouped.map(([donorId, g]) => (
            <div key={donorId} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{g.name}</div>
                  <div className="text-xs text-muted-foreground">Last: {format(new Date(g.lastAt), "d MMM yyyy")}</div>
                </div>
                <Badge variant={g.activeRows.length > 0 ? "default" : "secondary"} className="text-[10px]">
                  {g.activeRows.length > 0 ? "sponsoring" : "inactive"}
                </Badge>
              </div>
              <div className="text-xs space-y-0.5">
                {Array.from(g.totalNative.entries()).map(([cur, amt]) => (
                  <div key={cur} className="flex items-center justify-between">
                    <span>{formatMoney(amt, cur)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>≈ {formatMoney(g.totalBase, g.baseCur)} total</span>
                </div>
              </div>
              {isAdmin && g.activeRows.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t">
                  {g.activeRows.slice(0, 5).map((r: any) => (
                    <Button key={r.id} size="sm" variant="ghost" className="h-6 text-[10px]"
                            onClick={() => setRedirectAllocId(r.id)}>
                      Redirect {formatMoney(r.amount_native, r.native_currency)}
                      <FxChip nativeCurrency={r.native_currency} baseCurrency={r.base_currency} rate={r.fx_rate} at={r.fx_at} />
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
      {redirectAllocId && (() => {
        const a = rows.find((r: any) => r.id === redirectAllocId);
        return (
          <RedirectAllocationDialog
            allocationId={redirectAllocId}
            open={!!redirectAllocId}
            onOpenChange={(o) => !o && setRedirectAllocId(null)}
            projectId={a?.project_id}
            currentBeneficiaryId={beneficiaryId}
            amountNative={a?.amount_native}
            nativeCurrency={a?.native_currency}
            onDone={() => refetch()}
          />
        );
      })()}
    </Card>
  );
}