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
import { Plus, Trash2, Check, X, Receipt, Clock, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CurrencyAmount } from "@/components/finance/CurrencyAmount";

export function ExpenseTracking() {
  const { expenses, createExpense, updateExpense, deleteExpense, programs, budgets } = useFinancials();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    title: "", description: "", amount: "", currency: "KES", expense_date: format(new Date(), "yyyy-MM-dd"),
    vendor: "", program_id: "", budget_id: "", payment_method: "", reference_number: "", notes: "",
  });

  const handleCreate = () => {
    createExpense.mutate({
      title: form.title,
      description: form.description || null,
      amount: parseFloat(form.amount),
      currency: form.currency,
      expense_date: form.expense_date,
      vendor: form.vendor || null,
      program_id: form.program_id || null,
      budget_id: form.budget_id || null,
      payment_method: form.payment_method || null,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
      status: "pending",
    }, {
      onSuccess: () => {
        setCreateOpen(false);
        setForm({ title: "", description: "", amount: "", currency: "KES", expense_date: format(new Date(), "yyyy-MM-dd"), vendor: "", program_id: "", budget_id: "", payment_method: "", reference_number: "", notes: "" });
      }
    });
  };

  const handleApprove = (id: string) => updateExpense.mutate({ id, status: "approved", approved_at: new Date().toISOString() });
  const handleReject = (id: string) => updateExpense.mutate({ id, status: "rejected" });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { icon: any; className: string }> = {
      pending: { icon: Clock, className: "bg-warning/20 text-warning border-warning/30" },
      submitted: { icon: Receipt, className: "bg-info/20 text-info border-info/30" },
      approved: { icon: CheckCircle, className: "bg-success/20 text-success border-success/30" },
      rejected: { icon: XCircle, className: "bg-destructive/20 text-destructive border-destructive/30" },
      reimbursed: { icon: Check, className: "bg-primary/20 text-primary border-primary/30" },
    };
    const { icon: Icon, className } = map[status] || map.pending;
    return <Badge className={`gap-1 text-[10px] ${className}`}><Icon className="h-3 w-3" />{status}</Badge>;
  };

  if (expenses.isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>;
  }

  const allExpenses = expenses.data || [];
  const filtered = statusFilter === "all" ? allExpenses : allExpenses.filter(e => e.status === statusFilter);
  const totalPending = allExpenses.filter(e => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);
  const totalApproved = allExpenses.filter(e => e.status === "approved").reduce((s, e) => s + Number(e.amount), 0);
  const totalAll = allExpenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
          <div><p className="text-xs text-muted-foreground">Pending Approval</p><p className="text-lg font-bold text-foreground"><CurrencyAmount amount={totalPending} currency="KES" /></p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10"><CheckCircle className="h-5 w-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Approved</p><p className="text-lg font-bold text-foreground"><CurrencyAmount amount={totalApproved} currency="KES" /></p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Receipt className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-lg font-bold text-foreground"><CurrencyAmount amount={totalAll} currency="KES" /></p></div>
        </CardContent></Card>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="reimbursed">Reimbursed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Record Expense</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record New Expense</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="e.g. Transport to field visit" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} placeholder="0.00" /></div>
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({...p, currency: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">KES</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={e => setForm(p => ({...p, expense_date: e.target.value}))} /></div>
                <div><Label>Vendor</Label><Input value={form.vendor} onChange={e => setForm(p => ({...p, vendor: e.target.value}))} placeholder="Vendor name" /></div>
              </div>
              <div><Label>Program</Label>
                <Select value={form.program_id} onValueChange={v => setForm(p => ({...p, program_id: v}))}>
                  <SelectTrigger><SelectValue placeholder="Link to program (optional)" /></SelectTrigger>
                  <SelectContent>{programs.data?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Budget</Label>
                <Select value={form.budget_id} onValueChange={v => setForm(p => ({...p, budget_id: v}))}>
                  <SelectTrigger><SelectValue placeholder="Link to budget (optional)" /></SelectTrigger>
                  <SelectContent>{budgets.data?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Payment Method</Label><Input value={form.payment_method} onChange={e => setForm(p => ({...p, payment_method: e.target.value}))} placeholder="e.g. MPesa, Cash" /></div>
                <div><Label>Reference No.</Label><Input value={form.reference_number} onChange={e => setForm(p => ({...p, reference_number: e.target.value}))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} /></div>
              <Button onClick={handleCreate} disabled={!form.title || !form.amount} className="w-full">Record Expense</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Program</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No expenses found.</TableCell></TableRow>
              ) : filtered.map(exp => (
                <TableRow key={exp.id}>
                  <TableCell>
                    <div><p className="font-medium text-foreground">{exp.title}</p>{exp.vendor && <p className="text-xs text-muted-foreground">{exp.vendor}</p>}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(exp.expense_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(exp as any).programs?.name || "—"}</TableCell>
                  <TableCell className="text-right font-medium"><CurrencyAmount amount={Number(exp.amount)} currency={exp.currency} showOriginal={exp.currency !== 'KES'} /></TableCell>
                  <TableCell>{getStatusBadge(exp.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {exp.status === "pending" && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleApprove(exp.id)} title="Approve"><Check className="h-4 w-4 text-success" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleReject(exp.id)} title="Reject"><X className="h-4 w-4 text-destructive" /></Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteExpense.mutate(exp.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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
