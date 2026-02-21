import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Users, TrendingUp, DollarSign, ArrowRight, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";

export function DonorSupport() {
  const { currentOrganization } = useOrganization();
  const { userRole } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>("all");
  const canDelete = ["admin", "management", "owner"].includes(userRole || "");

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["donor-support-totals"] });
      queryClient.invalidateQueries({ queryKey: ["cost-analytics"] });
      toast.success("Transaction deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Fetch all financial transactions for donor support
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial-transactions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("organization_id", orgId!)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch beneficiary names for linking
  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["beneficiary-names", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("id, display_name")
        .eq("organization_id", orgId!)
        .limit(500);
      if (error) throw error;
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

  const beneficiaryMap = Object.fromEntries(beneficiaries.map(b => [b.id, b.display_name]));
  const programMap = Object.fromEntries(programs.map(p => [p.id, p.name]));

  const donorTransactions = transactions.filter(t => t.transaction_type === "beneficiary_support");
  const expenseTransactions = transactions.filter(t => t.transaction_type === "expense");
  
  const filtered = filterType === "all" ? transactions : transactions.filter(t => t.transaction_type === filterType);

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
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Program funding breakdown
  const programFunding: Record<string, { income: number; expenses: number }> = {};
  transactions.forEach(t => {
    if (!t.program_id) return;
    if (!programFunding[t.program_id]) programFunding[t.program_id] = { income: 0, expenses: 0 };
    if (t.transaction_type === "beneficiary_support" || t.transaction_type === "program_grant") {
      programFunding[t.program_id].income += Number(t.amount || 0);
    } else if (t.transaction_type === "expense") {
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
                {canDelete && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={canDelete ? 8 : 7} className="text-center text-muted-foreground py-8">
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
                  <TableCell className="text-sm text-muted-foreground">{t.beneficiary_id ? beneficiaryMap[t.beneficiary_id] || "—" : "—"}</TableCell>
                  <TableCell className={`text-right font-medium ${t.transaction_type === "expense" ? "text-destructive" : "text-success"}`}>
                    {t.currency} {Number(t.amount).toLocaleString()}
                  </TableCell>
                  {canDelete && (
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteTransaction.mutate(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}