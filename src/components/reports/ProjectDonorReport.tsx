import { forwardRef, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  projectId: string;
  donorAccountId: string;
  organizationName?: string;
  restriction?: "restricted" | "unrestricted" | "time_restricted";
  periodStart: string;
  periodEnd: string;
}

export const ProjectDonorReport = forwardRef<HTMLDivElement, Props>(function ProjectDonorReport(
  { projectId, donorAccountId, organizationName, restriction = "restricted", periodStart, periodEnd },
  _outerRef,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const project = useQuery({
    queryKey: ["donor-scope-project", projectId],
    queryFn: async () => {
      const { data } = await sb.from("projects").select("*, program:programs(name)").eq("id", projectId).maybeSingle();
      return data;
    },
  });

  const beneficiaries = useQuery({
    queryKey: ["donor-scope-project-bens", projectId],
    queryFn: async () => {
      const { data } = await sb
        .from("beneficiary_services")
        .select("beneficiary_id, beneficiary:beneficiaries(gender)")
        .eq("project_id", projectId)
        .eq("status", "active");
      return data || [];
    },
  });

  const activities = useQuery({
    queryKey: ["donor-scope-project-acts", projectId, periodStart, periodEnd],
    queryFn: async () => {
      const { data } = await sb
        .from("activities")
        .select("id, name, status, scheduled_at, completed_at, location")
        .eq("project_id", projectId)
        .gte("scheduled_at", periodStart)
        .lte("scheduled_at", periodEnd)
        .order("scheduled_at", { ascending: false });
      return data || [];
    },
  });

  const allocations = useQuery({
    queryKey: ["donor-scope-project-alloc", projectId, donorAccountId],
    queryFn: async () => {
      const { data } = await sb
        .from("allocations")
        .select("amount_base, base_currency, restriction, status")
        .eq("project_id", projectId)
        .eq("donor_account_id", donorAccountId);
      return data || [];
    },
  });

  const expenses = useQuery({
    queryKey: ["donor-scope-project-exp", projectId, periodStart, periodEnd],
    queryFn: async () => {
      const { data } = await sb
        .from("expenses")
        .select("total_amount, amount, currency, expense_date")
        .eq("project_id", projectId)
        .gte("expense_date", periodStart)
        .lte("expense_date", periodEnd);
      return data || [];
    },
  });

  const indicators = useQuery({
    queryKey: ["donor-scope-project-indicators", projectId],
    queryFn: async () => {
      const { data: inds } = await sb
        .from("indicators")
        .select("id, name, unit, target_value, project_id")
        .eq("project_id", projectId)
        .is("deleted_at", null);
      const ids = (inds || []).map((i: any) => i.id);
      if (!ids.length) return [];
      const { data: vals } = await sb
        .from("indicator_values")
        .select("indicator_id, actual_value, period_end")
        .in("indicator_id", ids)
        .order("period_end", { ascending: false });
      const latest = new Map<string, number>();
      (vals || []).forEach((v: any) => {
        if (!latest.has(v.indicator_id)) latest.set(v.indicator_id, Number(v.actual_value) || 0);
      });
      return (inds || []).map((i: any) => ({
        ...i,
        current: latest.get(i.id) ?? null,
        percent:
          i.target_value && latest.has(i.id) ? (latest.get(i.id)! / Number(i.target_value)) * 100 : null,
      }));
    },
  });

  const totalAllocated = (allocations.data || []).reduce((s: number, a: any) => s + Number(a.amount_base || 0), 0);
  const totalSpent = (expenses.data || []).reduce(
    (s: number, e: any) => s + Number(e.total_amount || e.amount || 0),
    0,
  );
  const budget = Number(project.data?.budget || project.data?.budget_amount || 0);
  const totalBens = (beneficiaries.data || []).length;
  const male = (beneficiaries.data || []).filter((b: any) => b.beneficiary?.gender === "Male").length;
  const female = (beneficiaries.data || []).filter((b: any) => b.beneficiary?.gender === "Female").length;
  const completed = (activities.data || []).filter((a: any) => a.status === "completed").length;

  const handleExport = async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      await exportNodeToPdf(ref.current, `project-report-${project.data?.name || projectId}.pdf`);
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
          <h2 className="text-xl font-bold text-foreground">{organizationName || "Organisation"}</h2>
          <h3 className="text-lg font-semibold text-foreground">
            {project.data?.name || "Project"} — Donor Report
          </h3>
          <p className="text-sm text-muted-foreground">
            Programme: {project.data?.program?.name || "—"} · Period: {periodStart} to {periodEnd}
          </p>
          <div className="flex justify-center pt-1">
            <RestrictionBadge restriction={restriction} />
          </div>
        </div>
        <Separator />

        <Card>
          <CardHeader><CardTitle className="text-base">Reach</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div><p className="text-2xl font-bold">{totalBens}</p><p className="text-muted-foreground">Beneficiaries</p></div>
              <div><p className="text-2xl font-bold">{male}</p><p className="text-muted-foreground">Male</p></div>
              <div><p className="text-2xl font-bold">{female}</p><p className="text-muted-foreground">Female</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Financials</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Project budget</p>
                <p className="font-semibold"><CurrencyAmount amount={budget} currency="KES" /></p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Your allocation</p>
                <p className="font-semibold"><CurrencyAmount amount={totalAllocated} currency="KES" /></p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Spent in period</p>
                <p className="font-semibold"><CurrencyAmount amount={totalSpent} currency="KES" /></p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              All figures shown in KES equivalent using recorded FX rate. <RestrictionBadge restriction={restriction} className="ml-1" />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Indicator performance</CardTitle></CardHeader>
          <CardContent>
            {(indicators.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No indicators tracked for this project.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Indicator</TableHead><TableHead>Target</TableHead><TableHead>Current</TableHead><TableHead className="text-right">%</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {(indicators.data || []).map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-sm">{i.name}</TableCell>
                      <TableCell className="text-sm">{i.target_value ?? "—"} {i.unit || ""}</TableCell>
                      <TableCell className="text-sm">{i.current ?? "—"} {i.unit || ""}</TableCell>
                      <TableCell className="text-right text-sm">{i.percent !== null ? `${i.percent.toFixed(0)}%` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activities delivered ({completed}/{(activities.data || []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {(activities.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities in this period.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(activities.data || []).slice(0, 10).map((a: any) => (
                  <li key={a.id} className="flex justify-between border-b pb-1">
                    <span>{a.name}</span>
                    <span className="text-muted-foreground text-xs">{a.status} · {a.location || "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});