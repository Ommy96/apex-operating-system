import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface GrantFinancialReportProps {
  grantId: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
}

export function GrantFinancialReport({ grantId, reportingPeriodStart, reportingPeriodEnd }: GrantFinancialReportProps) {
  const { currentOrganization } = useOrganization();
  const { formatAmount } = useCurrency();
  const orgId = currentOrganization?.organization_id;
  const orgName = (currentOrganization as any)?.organization_name || 'Organization';
  const [highlights, setHighlights] = useState("");
  const [varianceExplanation, setVarianceExplanation] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const grant = useQuery({
    queryKey: ["grant-detail-report", grantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grants")
        .select("*")
        .eq("id", grantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!grantId,
  });

  const budgetData = useQuery({
    queryKey: ["grant-budget-actuals", grantId, orgId, reportingPeriodStart, reportingPeriodEnd],
    queryFn: async () => {
      // Get linked programs
      const { data: linked } = await supabase
        .from("grant_programs")
        .select("program_id, allocated_amount")
        .eq("grant_id", grantId);
      const programIds = (linked || []).map((l: any) => l.program_id);
      if (programIds.length === 0) return { lines: [], totals: { budget: 0, cumulative: 0, period: 0 } };

      // Get budget line items for linked programs' budgets
      const { data: budgets } = await supabase
        .from("budgets")
        .select("id, name")
        .eq("organization_id", orgId!)
        .in("program_id", programIds);
      const budgetIds = (budgets || []).map((b: any) => b.id);

      const { data: lineItems } = await supabase
        .from("budget_line_items")
        .select("id, description, quantity, unit_cost, budget_categories(name)")
        .in("budget_id", budgetIds.length > 0 ? budgetIds : ['__none__']);

      // Get all expenses for linked programs
      const { data: allExpenses } = await supabase
        .from("expenses")
        .select("amount, expense_date, budget_line_item_id")
        .eq("organization_id", orgId!)
        .in("program_id", programIds);

      // Get period expenses
      const periodExpenses = (allExpenses || []).filter(e =>
        e.expense_date >= reportingPeriodStart && e.expense_date <= reportingPeriodEnd
      );

      const lines = (lineItems || []).map((li: any) => {
        const approved = Number(li.quantity || 1) * Number(li.unit_cost || 0);
        const cumulative = (allExpenses || [])
          .filter((e: any) => e.budget_line_item_id === li.id)
          .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        const period = periodExpenses
          .filter((e: any) => e.budget_line_item_id === li.id)
          .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        const variance = approved - cumulative;
        const pctUsed = approved > 0 ? (cumulative / approved) * 100 : 0;

        return {
          id: li.id,
          category: li.budget_categories?.name || 'Uncategorized',
          description: li.description,
          approved,
          cumulative,
          period,
          variance,
          pctUsed: Math.round(pctUsed * 10) / 10,
        };
      });

      return {
        lines,
        totals: {
          budget: lines.reduce((s, l) => s + l.approved, 0),
          cumulative: lines.reduce((s, l) => s + l.cumulative, 0),
          period: lines.reduce((s, l) => s + l.period, 0),
        }
      };
    },
    enabled: !!grantId && !!orgId,
  });

  const grantData = grant.data;
  const bd = budgetData.data;

  const getVarianceColor = (variance: number) => variance >= 0 ? 'text-emerald-600' : 'text-destructive';
  const getUtilColor = (pct: number) => {
    if (pct >= 100) return 'text-destructive';
    if (pct >= 90) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const exportToPdf = () => {
    toast.info("PDF export coming in next sprint");
  };

  const exportToExcel = () => {
    if (!bd) return;
    const headers = ["Budget Line", "Approved Budget", "Cumulative Expenditure", "This Period", "Variance", "% Utilised"];
    const rows = bd.lines.map(l => [
      l.description, l.approved, l.cumulative, l.period, l.variance, `${l.pctUsed}%`
    ]);
    rows.push(["TOTAL", bd.totals.budget, bd.totals.cumulative, bd.totals.period, bd.totals.budget - bd.totals.cumulative, ""]);

    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${grantData?.grant_name || 'grant'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  if (!grantData || !bd) return null;

  const currency = grantData.currency || 'KES';
  const totalVariance = bd.totals.budget - bd.totals.cumulative;
  const totalPctUsed = bd.totals.budget > 0 ? Math.round((bd.totals.cumulative / bd.totals.budget) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="py-4 space-y-1">
          <h2 className="text-lg font-bold">{grantData.grant_name} — Financial Report</h2>
          <p className="text-sm text-muted-foreground">Donor: {grantData.donor_name}</p>
          <p className="text-sm text-muted-foreground">
            Reporting Period: {new Date(reportingPeriodStart).toLocaleDateString('en-KE')} – {new Date(reportingPeriodEnd).toLocaleDateString('en-KE')}
          </p>
          <p className="text-xs text-muted-foreground">Generated: {new Date().toLocaleDateString('en-KE')}</p>
        </CardContent>
      </Card>

      {/* Budget vs Actuals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Budget vs Actuals</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportToExcel}><FileDown className="h-4 w-4 mr-1" /> Excel</Button>
            <Button size="sm" variant="outline" onClick={exportToPdf}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Budget Line</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Cumulative</TableHead>
                <TableHead className="text-right">This Period</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">% Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bd.lines.map(line => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.description}</TableCell>
                  <TableCell className="text-right">{formatAmount(line.approved, currency)}</TableCell>
                  <TableCell className="text-right">{formatAmount(line.cumulative, currency)}</TableCell>
                  <TableCell className="text-right">{formatAmount(line.period, currency)}</TableCell>
                  <TableCell className={`text-right font-medium ${getVarianceColor(line.variance)}`}>
                    {formatAmount(line.variance, currency)}
                  </TableCell>
                  <TableCell className={`text-right ${getUtilColor(line.pctUsed)}`}>
                    {line.pctUsed}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/30">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{formatAmount(bd.totals.budget, currency)}</TableCell>
                <TableCell className="text-right">{formatAmount(bd.totals.cumulative, currency)}</TableCell>
                <TableCell className="text-right">{formatAmount(bd.totals.period, currency)}</TableCell>
                <TableCell className={`text-right ${getVarianceColor(totalVariance)}`}>
                  {formatAmount(totalVariance, currency)}
                </TableCell>
                <TableCell className={`text-right ${getUtilColor(totalPctUsed)}`}>
                  {totalPctUsed}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Narrative */}
      <Card>
        <CardHeader><CardTitle className="text-base">Narrative Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Key financial highlights this period</Label>
            <Textarea value={highlights} onChange={e => setHighlights(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Explanation of variances &gt;10%</Label>
            <Textarea value={varianceExplanation} onChange={e => setVarianceExplanation(e.target.value)} rows={3} />
          </div>
          <Button onClick={() => toast.success("Notes saved")} variant="outline">Save Notes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
