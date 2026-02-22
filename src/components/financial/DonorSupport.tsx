import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Users, TrendingUp, DollarSign, ArrowRight, Download, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { downloadExcel } from "@/lib/downloadUtils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function DonorSupport() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>("all");

  // Real-time subscription for financial transactions and donor sources
  useRealtimeSubscription([
    {
      table: "financial_transactions",
      queryKeys: [["financial-transactions", orgId || ""], ["donor-support-totals", orgId || ""], ["cost-analytics", orgId || ""]],
      orgId,
      enabled: !!orgId,
    },
    {
      table: "beneficiary_donors",
      queryKeys: [["financial-transactions", orgId || ""]],
      orgId,
      enabled: !!orgId,
    },
    {
      table: "expenses",
      queryKeys: [["financial-transactions", orgId || ""]],
      orgId,
      enabled: !!orgId,
    },
  ]);

  // Fetch all financial transactions with beneficiary name joined
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial-transactions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*, beneficiary:beneficiaries!financial_transactions_beneficiary_id_fkey(display_name)")
        .eq("organization_id", orgId!)
        .order("transaction_date", { ascending: false });
      if (error) {
        // Fallback without join
        const { data: fallback, error: err2 } = await supabase
          .from("financial_transactions")
          .select("*")
          .eq("organization_id", orgId!)
          .order("transaction_date", { ascending: false });
        if (err2) throw err2;
        return fallback?.map(t => ({ ...t, beneficiary: null })) || [];
      }
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch program names
  const { data: programs = [] } = useQuery({
    queryKey: ["program-names-ft", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name")
        .eq("organization_id", orgId!)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;
  }

  const programMap = Object.fromEntries(programs.map(p => [p.id, p.name]));

  const getBeneficiaryName = (t: any): string => {
    if (t.beneficiary?.display_name) return t.beneficiary.display_name;
    return "—";
  };

  const donorTransactions = transactions.filter(t => t.transaction_type === "beneficiary_support");
  const expenseTransactions = transactions.filter(t => t.transaction_type === "expense");

  // For beneficiary_support, only keep the latest record per (beneficiary_id, program_id, donor_name)
  const latestDonorTransactionIds = new Set<string>();
  const seenDonorKeys = new Map<string, string>();
  // Sort descending by date so first seen = latest
  [...donorTransactions]
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .forEach(t => {
      const key = `${t.beneficiary_id || ''}_${t.program_id || ''}_${t.donor_name || ''}`;
      if (!seenDonorKeys.has(key)) {
        seenDonorKeys.set(key, t.id);
        latestDonorTransactionIds.add(t.id);
      }
    });

  // Deduplicated transactions: keep all non-donor transactions + only latest donor records
  const deduplicatedTransactions = transactions.filter(t =>
    t.transaction_type !== "beneficiary_support" || latestDonorTransactionIds.has(t.id)
  );

  const filtered = filterType === "all" ? deduplicatedTransactions : deduplicatedTransactions.filter(t => t.transaction_type === filterType);

  const formatExportRows = (rows: any[]) =>
    rows.map(t => ({
      Date: format(new Date(t.transaction_date), "dd MMM yyyy"),
      Type: t.transaction_type?.replace(/_/g, " ") || "",
      Description: t.description || "",
      Donor: t.donor_name || "",
      Program: t.program_id ? programMap[t.program_id] || "" : "",
      Beneficiary: getBeneficiaryName(t),
      Currency: t.currency || "KES",
      Amount: Number(t.amount || 0),
    }));

  const handleExportExcel = () => {
    const rows = formatExportRows(filtered);
    downloadExcel(rows, "Financial_Transactions_Ledger", "Transactions");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Financial Transactions Ledger", 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 24);

    const rows = formatExportRows(filtered);
    autoTable(doc, {
      startY: 30,
      head: [["Date", "Type", "Description", "Donor", "Program", "Beneficiary", "Currency", "Amount"]],
      body: rows.map(r => [r.Date, r.Type, r.Description, r.Donor, r.Program, r.Beneficiary, r.Currency, r.Amount.toLocaleString()]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Financial_Transactions_Ledger_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  // Summaries
  const totalDonorSupport = donorTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpenses = expenseTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalAll = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  const uniqueDonors = new Set(donorTransactions.map(t => t.donor_name).filter(Boolean)).size;
  const supportedBeneficiaries = new Set(donorTransactions.map(t => t.beneficiary_id).filter(Boolean)).size;

  // Donor summary for chart
  const donorSummary: Record<string, number> = {};
  donorTransactions.forEach(t => {
    const name = t.donor_name || "Unknown";
    donorSummary[name] = (donorSummary[name] || 0) + Number(t.amount || 0);
  });
  const donorChartData = Object.entries(donorSummary)
    .filter(([, amount]) => amount > 0)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Program funding breakdown — for Donor Income, only count the LATEST donor record per beneficiary+program+donor combo
  const programFunding: Record<string, { income: number; expenses: number }> = {};
  
  // Build a map of latest donor amounts per unique (beneficiary_id, program_id, donor_name)
  const latestDonorMap = new Map<string, number>();
  donorTransactions
    .filter(t => t.program_id)
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
    .forEach(t => {
      const key = `${t.beneficiary_id || ''}_${t.program_id}_${t.donor_name || ''}`;
      latestDonorMap.set(key, Number(t.amount || 0));
    });

  // Aggregate latest donor amounts by program
  latestDonorMap.forEach((amount, key) => {
    const programId = key.split('_')[1];
    if (!programId) return;
    if (!programFunding[programId]) programFunding[programId] = { income: 0, expenses: 0 };
    programFunding[programId].income += amount;
  });

  // Add expenses to program funding
  transactions.forEach(t => {
    if (!t.program_id) return;
    if (t.transaction_type === "expense") {
      if (!programFunding[t.program_id]) programFunding[t.program_id] = { income: 0, expenses: 0 };
      programFunding[t.program_id].expenses += Number(t.amount || 0);
    }
  });

  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      beneficiary_support: "bg-success/20 text-success border-success/30",
      expense: "bg-destructive/20 text-destructive border-destructive/30",
      program_grant: "bg-primary/20 text-primary border-primary/30",
      project_funding: "bg-info/20 text-info border-info/30",
      adjustment: "bg-warning/20 text-warning border-warning/30",
    };
    return map[type] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10"><Heart className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Donor Contributions</p><p className="text-lg font-bold text-foreground">KES {totalDonorSupport.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Transactions</p><p className="text-lg font-bold text-foreground">KES {totalAll.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10"><TrendingUp className="h-5 w-5 text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">Unique Donors</p><p className="text-lg font-bold text-foreground">{uniqueDonors}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10"><Users className="h-5 w-5 text-warning" /></div>
          <div><p className="text-xs text-muted-foreground">Beneficiaries Supported</p><p className="text-lg font-bold text-foreground">{supportedBeneficiaries}</p></div>
        </CardContent></Card>
      </div>

      {/* Donor Contributions Chart */}
      {donorChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Donors by Contribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={donorChartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Program Funding Flow */}
      {Object.keys(programFunding).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Program Funding Flow</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead className="text-right">Donor Income</TableHead>
                  <TableHead className="text-center"><ArrowRight className="h-4 w-4 mx-auto" /></TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(programFunding).map(([pid, data]) => {
                  const balance = data.income - data.expenses;
                  return (
                    <TableRow key={pid}>
                      <TableCell className="font-medium">{programMap[pid] || "Unknown"}</TableCell>
                      <TableCell className="text-right text-success">KES {data.income.toLocaleString()}</TableCell>
                      <TableCell className="text-center text-muted-foreground">→</TableCell>
                      <TableCell className="text-right text-destructive">KES {data.expenses.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-medium ${balance >= 0 ? "text-success" : "text-destructive"}`}>
                        KES {balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Transactions Ledger */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Financial Transactions Ledger</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExportPDF} disabled={filtered.length === 0}>
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExportExcel} disabled={filtered.length === 0}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </Button>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="beneficiary_support">Donor Support</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="program_grant">Grants</SelectItem>
              <SelectItem value="adjustment">Adjustments</SelectItem>
            </SelectContent>
           </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Beneficiary</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No transactions recorded yet. Donor contributions and expenses will appear here automatically.
                </TableCell></TableRow>
              ) : filtered.slice(0, 100).map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(t.transaction_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${getTypeBadge(t.transaction_type)}`}>
                      {t.transaction_type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{t.description || "—"}</TableCell>
                  <TableCell className="text-sm">{t.donor_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.program_id ? programMap[t.program_id] || "—" : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getBeneficiaryName(t)}</TableCell>
                  <TableCell className={`text-right font-medium ${t.transaction_type === "expense" ? "text-destructive" : "text-success"}`}>
                    {t.currency} {Number(t.amount).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
