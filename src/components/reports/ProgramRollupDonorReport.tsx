import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProgramRollups } from "@/hooks/useProgramRollups";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RestrictionBadge } from "@/components/funding/RestrictionBadge";
import { CurrencyAmount } from "@/components/finance/CurrencyAmount";
import { FileDown, Loader2 } from "lucide-react";
import { exportNodeToPdf } from "@/lib/pdfExport";
import { toast } from "sonner";

const sb = supabase as any;

interface Props {
  programId: string;
  donorAccountId: string;
  organizationName?: string;
  restriction?: "restricted" | "unrestricted" | "time_restricted";
  periodStart: string;
  periodEnd: string;
}

export function ProgramRollupDonorReport({
  programId,
  donorAccountId,
  organizationName,
  restriction = "restricted",
  periodStart,
  periodEnd,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const program = useQuery({
    queryKey: ["prog-roll-program", programId],
    queryFn: async () => {
      const { data } = await sb.from("programs").select("id, name, description").eq("id", programId).maybeSingle();
      return data;
    },
  });

  const { aggregated, projects, isLoading } = useProgramRollups(programId, orgId);

  const projectIds = (projects || []).map((p: any) => p.id);

  const projectSummaries = useQuery({
    queryKey: ["prog-roll-summaries", programId, projectIds.join("|")],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const [{ data: bens }, { data: exps }] = await Promise.all([
        sb
          .from("beneficiary_services")
          .select("project_id, beneficiary_id")
          .in("project_id", projectIds)
          .eq("status", "active"),
        sb
          .from("expenses")
          .select("project_id, total_amount, amount")
          .in("project_id", projectIds)
          .gte("expense_date", periodStart)
          .lte("expense_date", periodEnd),
      ]);
      const reach: Record<string, Set<string>> = {};
      (bens || []).forEach((b: any) => {
        (reach[b.project_id] ||= new Set()).add(b.beneficiary_id);
      });
      const spend: Record<string, number> = {};
      (exps || []).forEach((e: any) => {
        spend[e.project_id] = (spend[e.project_id] || 0) + Number(e.total_amount || e.amount || 0);
      });
      return (projects || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        reach: reach[p.id]?.size || 0,
        spend: spend[p.id] || 0,
      }));
    },
  });

  const donorTotal = useQuery({
    queryKey: ["prog-roll-donor-total", programId, donorAccountId],
    queryFn: async () => {
      const { data } = await sb
        .from("allocations")
        .select("amount_base")
        .eq("program_id", programId)
        .eq("donor_account_id", donorAccountId);
      return (data || []).reduce((s: number, a: any) => s + Number(a.amount_base || 0), 0);
    },
  });

  const combinedReach = (projectSummaries.data || []).reduce((s, r) => s + r.reach, 0);
  const combinedSpend = (projectSummaries.data || []).reduce((s, r) => s + r.spend, 0);

  const handleExport = async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      await exportNodeToPdf(ref.current, `programme-rollup-${program.data?.name || programId}.pdf`);
      toast.success("PDF exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
          Export PDF
        </Button>
      </div>
      <div ref={ref} className="space-y-6 bg-background p-6 rounded-lg border">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">{organizationName || "Organisation"}</h2>
          <h3 className="text-lg font-semibold">{program.data?.name} — Programme Rollup Report</h3>
          <p className="text-sm text-muted-foreground">Period: {periodStart} to {periodEnd}</p>
          <div className="flex justify-center pt-1"><RestrictionBadge restriction={restriction} /></div>
        </div>
        <Separator />

        <Card>
          <CardHeader><CardTitle className="text-base">Programme reach & spend</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center text-sm">
              <div><p className="text-2xl font-bold">{projects.length}</p><p className="text-muted-foreground">Projects</p></div>
              <div><p className="text-2xl font-bold">{combinedReach}</p><p className="text-muted-foreground">Combined reach</p></div>
              <div><p className="text-2xl font-bold"><CurrencyAmount amount={combinedSpend} currency="KES" /></p><p className="text-muted-foreground">Spent in period</p></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Your contribution allocated to this programme: <span className="font-medium"><CurrencyAmount amount={donorTotal.data || 0} currency="KES" /></span>. All figures in KES equivalent.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Normalised cross-project indicators</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : aggregated.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No programme rollup indicators defined. Configure them in Programme Settings to enable cross-project aggregation.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Indicator</TableHead><TableHead>Scale</TableHead><TableHead>Target</TableHead><TableHead className="text-right">Aggregated value</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {aggregated.map((row) => (
                    <TableRow key={row.rollup.id}>
                      <TableCell className="text-sm">{row.rollup.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.rollup.normalized_scale}</TableCell>
                      <TableCell className="text-sm">{row.rollup.target_value ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {row.value !== null ? row.value.toFixed(1) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Per-project summary</CardTitle></CardHeader>
          <CardContent>
            {(projectSummaries.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects in this programme.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Project</TableHead><TableHead className="text-right">Reach</TableHead><TableHead className="text-right">Spent</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {(projectSummaries.data || []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{p.name}</TableCell>
                      <TableCell className="text-right text-sm">{p.reach}</TableCell>
                      <TableCell className="text-right text-sm"><CurrencyAmount amount={p.spend} currency="KES" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}