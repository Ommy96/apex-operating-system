import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowDown, ArrowUp, Wallet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function PettyCashTab() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<string | null>(null);
  const [txnOpen, setTxnOpen] = useState<{ type: 'disbursement' | 'replenishment'; fundId: string } | null>(null);

  const [fundForm, setFundForm] = useState({ fund_name: "", opening_balance: "", project_id: "" });
  const [txnForm, setTxnForm] = useState({ amount: "", description: "" });

  const funds = useQuery({
    queryKey: ["petty-cash-funds", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petty_cash_funds")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const transactions = useQuery({
    queryKey: ["petty-cash-txns", selectedFund],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petty_cash_transactions")
        .select("*")
        .eq("fund_id", selectedFund!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFund,
  });

  const projects = useQuery({
    queryKey: ["projects-list-pc", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createFund = useMutation({
    mutationFn: async () => {
      const balance = parseFloat(fundForm.opening_balance);
      if (!fundForm.fund_name || isNaN(balance)) throw new Error("Name and balance required");
      const { error } = await supabase.from("petty_cash_funds").insert({
        org_id: orgId!,
        fund_name: fundForm.fund_name,
        opening_balance: balance,
        current_balance: balance,
        project_id: fundForm.project_id || null,
        custodian_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      toast.success("Fund created");
      setCreateOpen(false);
      setFundForm({ fund_name: "", opening_balance: "", project_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createTxn = useMutation({
    mutationFn: async () => {
      if (!txnOpen) throw new Error("No fund selected");
      const amount = parseFloat(txnForm.amount);
      if (isNaN(amount) || amount <= 0) throw new Error("Valid amount required");
      if (!txnForm.description) throw new Error("Description required");

      const { error } = await supabase.from("petty_cash_transactions").insert({
        fund_id: txnOpen.fundId,
        transaction_type: txnOpen.type,
        amount,
        description: txnForm.description,
        recorded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      queryClient.invalidateQueries({ queryKey: ["petty-cash-txns"] });
      toast.success("Transaction recorded");
      setTxnOpen(null);
      setTxnForm({ amount: "", description: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fmtAmount = (val: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);

  const getFundStatus = (fund: any) => {
    const pct = Number(fund.current_balance) / Number(fund.opening_balance);
    if (pct <= 0) return { label: "Depleted", className: "bg-destructive/10 text-destructive" };
    if (pct < 0.2) return { label: "Low", className: "bg-[var(--status-warning-bg)] text-[var(--status-warning)] dark:text-[var(--status-warning)]" };
    return { label: "Active", className: "bg-[var(--status-success-bg)] text-[var(--status-success)] dark:text-[var(--status-success)]" };
  };

  const selectedFundData = (funds.data || []).find(f => f.id === selectedFund);

  if (selectedFund && selectedFundData) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setSelectedFund(null)}>← Back to Funds</Button>

        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">{selectedFundData.fund_name}</p>
            <p className="text-3xl font-bold mt-1">{fmtAmount(Number(selectedFundData.current_balance))}</p>
            <p className="text-xs text-muted-foreground mt-1">of {fmtAmount(Number(selectedFundData.opening_balance))} opening balance</p>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTxnOpen({ type: "disbursement", fundId: selectedFund })}>
            <ArrowDown className="h-4 w-4 mr-1" /> Disbursement
          </Button>
          <Button variant="outline" onClick={() => setTxnOpen({ type: "replenishment", fundId: selectedFund })}>
            <ArrowUp className="h-4 w-4 mr-1" /> Replenishment
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(transactions.data || []).map(txn => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-muted-foreground">{new Date(txn.transaction_date).toLocaleDateString('en-KE')}</TableCell>
                    <TableCell>
                      <Badge variant={txn.transaction_type === 'disbursement' ? 'destructive' : 'default'}>
                        {txn.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell className={`text-right font-medium ${txn.transaction_type === 'disbursement' ? 'text-destructive' : 'text-[var(--status-success)]'}`}>
                      {txn.transaction_type === 'disbursement' ? '-' : '+'}{fmtAmount(Number(txn.amount))}
                    </TableCell>
                  </TableRow>
                ))}
                {(transactions.data || []).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No transactions yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Transaction dialog */}
        <Dialog open={!!txnOpen} onOpenChange={() => setTxnOpen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{txnOpen?.type === 'disbursement' ? 'Record Disbursement' : 'Record Replenishment'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Amount (KES)</Label>
                <Input type="number" value={txnForm.amount} onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={txnForm.description} onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))} placeholder="What was this for?" />
              </div>
              <Button onClick={() => createTxn.mutate()} disabled={createTxn.isPending} className="w-full">
                Record Transaction
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Petty Cash Funds</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Fund</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Petty Cash Fund</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Fund Name</Label>
                <Input value={fundForm.fund_name} onChange={e => setFundForm(f => ({ ...f, fund_name: e.target.value }))} placeholder="e.g. Office Petty Cash" />
              </div>
              <div>
                <Label>Opening Balance (KES)</Label>
                <Input type="number" value={fundForm.opening_balance} onChange={e => setFundForm(f => ({ ...f, opening_balance: e.target.value }))} />
              </div>
              <div>
                <Label>Project (Optional)</Label>
                <Select value={fundForm.project_id} onValueChange={v => setFundForm(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {(projects.data || []).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createFund.mutate()} disabled={createFund.isPending} className="w-full">Create Fund</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(funds.data || []).map(fund => {
          const status = getFundStatus(fund);
          return (
            <Card key={fund.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedFund(fund.id)}>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{fund.fund_name}</span>
                  </div>
                  <Badge className={status.className}>{status.label}</Badge>
                </div>
                <p className="text-2xl font-bold">{fmtAmount(Number(fund.current_balance))}</p>
                <p className="text-xs text-muted-foreground">Opening: {fmtAmount(Number(fund.opening_balance))}</p>
              </CardContent>
            </Card>
          );
        })}
        {(funds.data || []).length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No petty cash funds yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
