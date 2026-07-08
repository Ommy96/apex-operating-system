import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { FxChip } from "./FxChip";
import { RestrictionBadge } from "./RestrictionBadge";
import { formatMoney } from "@/lib/allocationEngine";
import { useOrganization } from "@/hooks/useOrganization";

interface Props { projectId: string; targetTotalBase?: number | null; }

export function ProjectFundingTab({ projectId, targetTotalBase }: Props) {
  const { currentOrganization: organization } = useOrganization();

  const { data: pools, isLoading: lp } = useQuery({
    queryKey: ["project-pools", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("donor_pools")
        .select("*, donor_accounts:donor_account_id(donor_name)")
        .eq("scope_project_id", projectId)
        .order("balance_base", { ascending: false });
      return data ?? [];
    },
  });

  const { data: allocations, isLoading: la } = useQuery({
    queryKey: ["project-allocations", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("allocations")
        .select("*, donor_accounts:donor_account_id(donor_name), beneficiaries:beneficiary_id(id,first_name,last_name)")
        .eq("project_id", projectId)
        .order("allocated_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const { data: enrolled, isLoading: le } = useQuery({
    queryKey: ["project-enrolled", projectId],
    enabled: !!projectId && !!organization?.organization_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("beneficiary_services")
        .select("beneficiary_id, beneficiaries:beneficiary_id(id, first_name, last_name, unique_id)")
        .eq("organization_id", organization!.organization_id)
        .eq("project_id", projectId)
        .eq("status", "active");
      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    const allocs = allocations ?? [];
    const active = allocs.filter((a: any) => a.status === "active");
    const allocatedBase = active.reduce((s: number, a: any) => s + Number(a.amount_base ?? 0), 0);
    const poolBase = (pools ?? []).reduce((s: number, p: any) => s + Number(p.balance_base ?? 0), 0);
    const baseCur = (pools ?? [])[0]?.currency ?? (allocs[0] as any)?.base_currency ?? "KES";
    const benFunding = new Map<string, number>();
    for (const a of active) {
      if (!a.beneficiary_id) continue;
      benFunding.set(a.beneficiary_id, (benFunding.get(a.beneficiary_id) ?? 0) + Number(a.amount_base ?? 0));
    }
    const unfunded = (enrolled ?? []).filter((e: any) => !benFunding.has(e.beneficiary_id));
    return { allocatedBase, poolBase, baseCur, unfunded, benFunding, totalEnrolled: enrolled?.length ?? 0 };
  }, [allocations, pools, enrolled]);

  const coverage = targetTotalBase && targetTotalBase > 0
    ? Math.min(100, (totals.allocatedBase / targetTotalBase) * 100)
    : null;

  if (lp || la || le) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Allocated</div>
          <div className="text-xl font-semibold">{formatMoney(totals.allocatedBase, totals.baseCur)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">In pool</div>
          <div className="text-xl font-semibold">{formatMoney(totals.poolBase, totals.baseCur)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Coverage</div>
          {coverage != null
            ? <><div className="text-xl font-semibold">{coverage.toFixed(0)}%</div><Progress value={coverage} className="mt-1 h-1" /></>
            : <div className="text-xl font-semibold">—</div>}
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Unfunded enrolled beneficiaries ({totals.unfunded.length}/{totals.totalEnrolled})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {totals.unfunded.length === 0
            ? <div className="p-4 text-sm text-muted-foreground">All enrolled beneficiaries are funded.</div>
            : <ul className="divide-y">
                {totals.unfunded.slice(0, 20).map((e: any) => (
                  <li key={e.beneficiary_id} className="px-4 py-2 text-sm flex items-center justify-between">
                    <span>{(e.beneficiaries?.first_name ?? "") + " " + (e.beneficiaries?.last_name ?? "")}</span>
                    <Badge variant="outline" className="text-[10px]">{e.beneficiaries?.unique_id ?? ""}</Badge>
                  </li>
                ))}
              </ul>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Allocation history</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Beneficiary</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(allocations ?? []).slice(0, 50).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{format(new Date(a.allocated_at), "d MMM")}</TableCell>
                  <TableCell className="text-xs">{a.donor_accounts?.donor_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{a.beneficiaries ? `${a.beneficiaries.first_name ?? ""} ${a.beneficiaries.last_name ?? ""}` : "—"}</TableCell>
                  <TableCell className="text-right text-xs flex items-center justify-end gap-1">
                    {formatMoney(a.amount_native, a.native_currency)}
                    <FxChip nativeCurrency={a.native_currency} baseCurrency={a.base_currency} rate={a.fx_rate} at={a.fx_at} />
                    <RestrictionBadge restriction={a.restriction} />
                  </TableCell>
                  <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"} className="text-[10px]">{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}