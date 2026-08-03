import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { FxChip } from "@/components/funding/FxChip";
import { RestrictionBadge } from "@/components/funding/RestrictionBadge";
import { formatMoney } from "@/lib/allocationEngine";

export default function AllocationEngine() {
  const { currentOrganization: organization } = useOrganization();
  const orgId = organization?.organization_id;

  const { data: intents } = useQuery({
    queryKey: ["intents-totals", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("donation_intents")
        .select("committed_amount, committed_currency")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  const { data: donations } = useQuery({
    queryKey: ["donations-totals", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("donations")
        .select("amount, currency, status")
        .eq("organization_id", orgId!);
      return data ?? [];
    },
  });

  const { data: pools, isLoading: lp } = useQuery({
    queryKey: ["donor-pools", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("donor_pools")
        .select("*, donor_accounts:donor_account_id(donor_name)")
        .eq("organization_id", orgId!)
        .gt("balance_base", 0)
        .order("balance_base", { ascending: false });
      return data ?? [];
    },
  });

  const { data: allocations, isLoading: la } = useQuery({
    queryKey: ["recent-allocations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("allocations")
        .select("*, donor_accounts:donor_account_id(donor_name), beneficiaries:beneficiary_id(first_name,last_name), projects:project_id(name)")
        .eq("organization_id", orgId!)
        .order("allocated_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    const allocs = allocations ?? [];
    const allocatedBase = allocs.filter((a: any) => a.status === "active").reduce((s: number, a: any) => s + Number(a.amount_base ?? 0), 0);
    const poolBase = (pools ?? []).reduce((s: number, p: any) => s + Number(p.balance_base ?? 0), 0);
    const receivedTotal = (donations ?? []).filter((d: any) => ["completed","succeeded","success"].includes(d.status)).reduce((s: number, d: any) => s + Number(d.amount ?? 0), 0);
    const committedTotal = (intents ?? []).reduce((s: number, i: any) => s + Number(i.committed_amount ?? 0), 0);
    const baseCur = (pools ?? [])[0]?.currency ?? (allocs[0] as any)?.base_currency ?? "KES";
    const byScope: Record<string, number> = { direct_beneficiary: 0, project_pool: 0, program_unrestricted: 0 };
    for (const p of pools ?? []) byScope[p.scope] = (byScope[p.scope] ?? 0) + Number(p.balance_base ?? 0);
    return { allocatedBase, poolBase, receivedTotal, committedTotal, baseCur, byScope };
  }, [allocations, pools, donations, intents]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Allocation Engine</h1>
        <p className="text-sm text-muted-foreground">Donors decoupled from beneficiaries via dynamic pools.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Committed" value={formatMoney(totals.committedTotal, totals.baseCur)} />
        <SummaryCard label="Received" value={formatMoney(totals.receivedTotal, totals.baseCur)} />
        <SummaryCard label="Allocated (active)" value={formatMoney(totals.allocatedBase, totals.baseCur)} />
        <SummaryCard label="In pools" value={formatMoney(totals.poolBase, totals.baseCur)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ScopeCard label="Direct beneficiary" amount={totals.byScope.direct_beneficiary} cur={totals.baseCur} />
        <ScopeCard label="Project pool" amount={totals.byScope.project_pool} cur={totals.baseCur} />
        <ScopeCard label="Program / unrestricted" amount={totals.byScope.program_unrestricted} cur={totals.baseCur} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Donor pools with balance</CardTitle></CardHeader>
        <CardContent className="p-0">
          {lp ? <div className="p-4"><Skeleton className="h-24 w-full" /></div>
            : (pools ?? []).length === 0 ? <div className="p-6 text-sm text-muted-foreground text-center">No pools with balance.</div>
            : <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow>
                  <TableHead>Donor</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Native</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pools!.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-medium">{p.donor_accounts?.donor_name ?? "—"}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">{p.scope}</Badge>
                        <RestrictionBadge restriction={p.restriction} />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{p.currency}</TableCell>
                      <TableCell className="text-right text-xs">{formatMoney(p.balance_native, p.currency)}</TableCell>
                      <TableCell className="text-right text-xs">{formatMoney(p.balance_base, totals.baseCur)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent allocations</CardTitle></CardHeader>
        <CardContent className="p-0">
          {la ? <div className="p-4"><Skeleton className="h-24 w-full" /></div>
            : (allocations ?? []).length === 0 ? <div className="p-6 text-sm text-muted-foreground text-center">No allocations yet.</div>
            : <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Donor → Beneficiary</TableHead>
                  <TableHead className="hidden md:table-cell">Project</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {allocations!.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{format(new Date(a.allocated_at), "d MMM HH:mm")}</TableCell>
                      <TableCell className="text-xs">
                        <span>{a.donor_accounts?.donor_name ?? "—"}</span>
                        <span className="text-muted-foreground"> → </span>
                        <span>{a.beneficiaries ? `${a.beneficiaries.first_name ?? ""} ${a.beneficiaries.last_name ?? ""}` : "—"}</span>
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell">{a.projects?.name ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs flex items-center justify-end gap-1">
                        {formatMoney(a.amount_native, a.native_currency)}
                        <FxChip nativeCurrency={a.native_currency} baseCurrency={a.base_currency} rate={a.fx_rate} at={a.fx_at} />
                        <RestrictionBadge restriction={a.restriction} />
                      </TableCell>
                      <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"} className="text-[10px]">{a.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-semibold">{value}</div></CardContent></Card>;
}
function ScopeCard({ label, amount, cur }: { label: string; amount: number; cur: string }) {
  return <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-semibold">{formatMoney(amount, cur)}</div></CardContent></Card>;
}