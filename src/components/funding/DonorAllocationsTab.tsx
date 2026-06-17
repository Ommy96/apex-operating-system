import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { FxChip } from "./FxChip";
import { formatMoney } from "@/lib/allocationEngine";

interface Props { donorAccountId: string; }

export function DonorAllocationsTab({ donorAccountId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["donor-allocations", donorAccountId],
    enabled: !!donorAccountId,
    queryFn: async () => {
      const { data } = await supabase
        .from("allocations")
        .select("*, beneficiaries:beneficiary_id(id,first_name,last_name,unique_id), projects:project_id(id,name), programs:program_id(id,name)")
        .eq("donor_account_id", donorAccountId)
        .order("allocated_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const rows = data ?? [];

  const csv = useMemo(() => {
    const head = ["date","beneficiary","project","program","amount_native","native_currency","fx_rate","amount_base","base_currency","status","scope"];
    const lines = rows.map((r: any) => [
      r.allocated_at,
      `${r.beneficiaries?.first_name ?? ""} ${r.beneficiaries?.last_name ?? ""}`.trim(),
      r.projects?.name ?? "",
      r.programs?.name ?? "",
      r.amount_native, r.native_currency, r.fx_rate, r.amount_base, r.base_currency, r.status, r.scope,
    ].map((v) => `"${String(v ?? "").replace(/"/g,'""')}"`).join(","));
    return [head.join(","), ...lines].join("\n");
  }, [rows]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `donor-allocations-${donorAccountId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Allocations</CardTitle>
        <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!rows.length}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No allocations yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead className="hidden md:table-cell">Project</TableHead>
                  <TableHead className="text-right">Native</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Base</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{format(new Date(r.allocated_at), "d MMM yyyy")}</TableCell>
                    <TableCell className="text-xs">
                      {r.beneficiaries ? `${r.beneficiaries.first_name ?? ""} ${r.beneficiaries.last_name ?? ""}`.trim() : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs hidden md:table-cell">{r.projects?.name ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs flex items-center justify-end gap-1">
                      {formatMoney(r.amount_native, r.native_currency)}
                      <FxChip nativeCurrency={r.native_currency} baseCurrency={r.base_currency} rate={r.fx_rate} at={r.fx_at} />
                    </TableCell>
                    <TableCell className="text-right text-xs hidden md:table-cell">{formatMoney(r.amount_base, r.base_currency)}</TableCell>
                    <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}