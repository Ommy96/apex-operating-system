import { useState } from "react";
import { useFinancials } from "@/hooks/useFinancials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Eye, DollarSign, TrendingUp, AlertTriangle, Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyAmount } from "@/components/finance/CurrencyAmount";

export function BudgetPlanning() {
  const { budgets, createBudget, deleteBudget, programs, useBudgetLineItems, createLineItem, deleteLineItem } = useFinancials();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailBudgetId, setDetailBudgetId] = useState<string | null>(null);
  const [addLineOpen, setAddLineOpen] = useState(false);
  const lineItems = useBudgetLineItems(detailBudgetId);

  const [form, setForm] = useState({
    name: "", description: "", fiscal_year: new Date().getFullYear(), currency: "KES",
    total_amount: "", program_id: "", project_id: "", status: "draft",
  });

  const [lineForm, setLineForm] = useState({ description: "", quantity: "1", unit_cost: "", notes: "" });

  const handleCreate = () => {
    createBudget.mutate({
      name: form.name,
      description: form.description || null,
      fiscal_year: form.fiscal_year,
      currency: form.currency,
      total_amount: parseFloat(form.total_amount) || 0,
      program_id: form.program_id || null,
      status: form.status,
    }, {
      onSuccess: () => {
        setCreateOpen(false);
        setForm({ name: "", description: "", fiscal_year: new Date().getFullYear(), currency: "KES", total_amount: "", program_id: "", project_id: "", status: "draft" });
      }
    });
  };

  const handleAddLine = () => {
    if (!detailBudgetId) return;
    createLineItem.mutate({
      budget_id: detailBudgetId,
      description: lineForm.description,
      quantity: parseFloat(lineForm.quantity) || 1,
      unit_cost: parseFloat(lineForm.unit_cost) || 0,
      notes: lineForm.notes || null,
    }, {
      onSuccess: () => {
        setAddLineOpen(false);
        setLineForm({ description: "", quantity: "1", unit_cost: "", notes: "" });
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success/20 text-success border-success/30";
      case "draft": return "bg-warning/20 text-warning border-warning/30";
      case "closed": return "bg-muted text-muted-foreground";
      case "revised": return "bg-info/20 text-info border-info/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (budgets.isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;
  }

  const budgetList = budgets.data || [];
  const totalBudgeted = budgetList.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const activeBudgets = budgetList.filter(b => b.status === "active").length;

  // Detail view
  if (detailBudgetId) {
    const budget = budgetList.find(b => b.id === detailBudgetId);
    if (!budget) return null;
    const items = lineItems.data || [];
    const totalLineItems = items.reduce((s, li) => s + Number(li.total_amount || 0), 0);
    const totalSpent = items.reduce((s, li) => s + Number(li.actual_spent || 0), 0);
    const utilization = totalLineItems > 0 ? (totalSpent / totalLineItems) * 100 : 0;
    const burnRate = totalLineItems > 0 ? (totalSpent / totalLineItems) * 100 : 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setDetailBudgetId(null)} className="mb-2">← Back to Budgets</Button>
            <h2 className="text-xl font-bold text-foreground">{budget.name}</h2>
            <p className="text-sm text-muted-foreground">FY {budget.fiscal_year} · {budget.currency}</p>
          </div>
          <Badge className={getStatusColor(budget.status)}>{budget.status}</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Budget</p>
            <p className="text-lg font-bold text-foreground"><CurrencyAmount amount={Number(budget.total_amount)} currency={budget.currency} /></p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Line Items Total</p>
            <p className="text-lg font-bold text-foreground">{budget.currency} {totalLineItems.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-lg font-bold text-foreground">{budget.currency} {totalSpent.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Burn Rate</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-lg font-bold text-foreground">{burnRate.toFixed(1)}%</p>
              {burnRate > 80 && <AlertTriangle className="h-4 w-4 text-warning" />}
            </div>
            <Progress value={Math.min(utilization, 100)} className="mt-2 h-2" />
          </CardContent></Card>
        </div>

        {/* Line Items Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Dialog open={addLineOpen} onOpenChange={setAddLineOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Budget Line Item</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Description</Label><Input value={lineForm.description} onChange={e => setLineForm(p => ({...p, description: e.target.value}))} placeholder="e.g. Staff salaries" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Quantity</Label><Input type="number" value={lineForm.quantity} onChange={e => setLineForm(p => ({...p, quantity: e.target.value}))} /></div>
                    <div><Label>Unit Cost ({budget.currency})</Label><Input type="number" value={lineForm.unit_cost} onChange={e => setLineForm(p => ({...p, unit_cost: e.target.value}))} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea value={lineForm.notes} onChange={e => setLineForm(p => ({...p, notes: e.target.value}))} /></div>
                  <Button onClick={handleAddLine} disabled={!lineForm.description || !lineForm.unit_cost} className="w-full">Add Line Item</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No line items yet. Add your first budget line item.</TableCell></TableRow>
                ) : items.map(item => {
                  const variance = Number(item.total_amount || 0) - Number(item.actual_spent || 0);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{Number(item.unit_cost).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{Number(item.total_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(item.actual_spent).toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-medium ${variance < 0 ? 'text-destructive' : 'text-success'}`}>{variance.toLocaleString()}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => deleteLineItem.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Budgeted</p><p className="text-lg font-bold text-foreground">KES {totalBudgeted.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Active Budgets</p><p className="text-lg font-bold text-foreground">{activeBudgets}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10"><Wallet className="h-5 w-5 text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">Total Budgets</p><p className="text-lg font-bold text-foreground">{budgetList.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">All Budgets</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> New Budget</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New Budget</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Budget Name</Label><Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Q1 2026 Operations" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Fiscal Year</Label><Input type="number" value={form.fiscal_year} onChange={e => setForm(p => ({...p, fiscal_year: parseInt(e.target.value)}))} /></div>
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({...p, currency: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">KES</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Total Amount</Label><Input type="number" value={form.total_amount} onChange={e => setForm(p => ({...p, total_amount: e.target.value}))} placeholder="0.00" /></div>
              <div><Label>Linked Program</Label>
                <Select value={form.program_id} onValueChange={v => setForm(p => ({...p, program_id: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select program (optional)" /></SelectTrigger>
                  <SelectContent>
                    {programs.data?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={!form.name || !form.total_amount} className="w-full">Create Budget</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Cards */}
      {budgetList.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No budgets yet. Create your first budget to get started.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {budgetList.map(budget => (
            <Card key={budget.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetailBudgetId(budget.id)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{budget.name}</p>
                    <p className="text-xs text-muted-foreground">
                      FY {budget.fiscal_year} · {(budget as any).programs?.name || "No program"} 
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-foreground">{budget.currency} {Number(budget.total_amount).toLocaleString()}</p>
                    <Badge className={`text-[10px] ${getStatusColor(budget.status)}`}>{budget.status}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDetailBudgetId(budget.id); }}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteBudget.mutate(budget.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
