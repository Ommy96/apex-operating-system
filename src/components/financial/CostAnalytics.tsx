import { useFinancials } from "@/hooks/useFinancials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, Users, TrendingDown, PieChart as PieChartIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "hsl(222, 47%, 31%)",
  "hsl(217, 91%, 60%)",
  "hsl(142, 72%, 42%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 70%, 50%)",
  "hsl(210, 100%, 50%)",
  "hsl(350, 80%, 50%)",
];

export function CostAnalytics() {
  const { costAnalytics } = useFinancials();

  if (costAnalytics.isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;
  }

  const data = costAnalytics.data;
  if (!data) return null;

  const { programCosts, totalExpenses, totalBeneficiaries, overallCostPerBeneficiary } = data;

  const barData = programCosts
    .filter(p => p.costPerBeneficiary > 0)
    .sort((a, b) => b.costPerBeneficiary - a.costPerBeneficiary);

  const pieData = programCosts
    .filter(p => p.totalSpent > 0)
    .map(p => ({ name: p.name, value: p.totalSpent }));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-lg font-bold text-foreground">KES {totalExpenses.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10"><Users className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Active Beneficiaries</p><p className="text-lg font-bold text-foreground">{totalBeneficiaries.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10"><TrendingDown className="h-5 w-5 text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">Cost Per Beneficiary</p><p className="text-lg font-bold text-foreground">KES {overallCostPerBeneficiary.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10"><PieChartIcon className="h-5 w-5 text-warning" /></div>
          <div><p className="text-xs text-muted-foreground">Programs Tracked</p><p className="text-lg font-bold text-foreground">{programCosts.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost Per Beneficiary Bar Chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Cost Per Beneficiary by Program</CardTitle></CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No cost data available yet. Record expenses and link them to programs.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                  <Bar dataKey="costPerBeneficiary" fill="hsl(222, 47%, 31%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Expense Distribution Pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Expense Distribution</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No expense distribution data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Program Cost Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Beneficiaries</TableHead>
                <TableHead className="text-right">Cost/Beneficiary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programCosts.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No program cost data yet.</TableCell></TableRow>
              ) : programCosts.sort((a, b) => b.totalSpent - a.totalSpent).map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">KES {p.totalSpent.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{p.beneficiaryCount}</TableCell>
                  <TableCell className="text-right font-medium">KES {p.costPerBeneficiary.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
