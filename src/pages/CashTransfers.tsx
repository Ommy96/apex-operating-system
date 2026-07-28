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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Upload, Send, Check, X, DollarSign, AlertTriangle, FileText, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatMpesaPhone, isValidMpesaPhone } from "@/lib/mpesa";
import { BeneficiarySelector } from "@/components/BeneficiarySelector";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-primary/10 text-primary",
  processing: "bg-[var(--status-warning-bg)] text-[var(--status-warning)] dark:bg-amber-900/30 dark:text-[var(--status-warning)]",
  completed: "bg-[var(--status-success-bg)] text-[var(--status-success)] dark:bg-emerald-900/30 dark:text-[var(--status-success)]",
  partial: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  failed: "bg-destructive/10 text-destructive",
  pending: "bg-muted text-muted-foreground",
};

export default function CashTransfers() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;
  const [activeTab, setActiveTab] = useState("new-batch");
  const [createOpen, setCreateOpen] = useState(false);

  const [batchForm, setBatchForm] = useState({
    batch_name: "",
    grant_id: "",
    project_id: "",
    purpose: "",
  });

  const [recipients, setRecipients] = useState<Array<{
    recipient_name: string;
    phone_number: string;
    amount_kes: string;
    beneficiary_id?: string;
  }>>([]);

  // Queries
  const batches = useQuery({
    queryKey: ["cash-transfer-batches", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_transfer_batches")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const grants = useQuery({
    queryKey: ["grants-list", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grants").select("id, grant_name").eq("organization_id", orgId!).eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const projects = useQuery({
    queryKey: ["projects-list-ct", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const addRecipient = () => {
    setRecipients(prev => [...prev, { recipient_name: "", phone_number: "", amount_kes: "" }]);
  };

  const updateRecipient = (index: number, field: string, value: string) => {
    setRecipients(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const removeRecipient = (index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const totalAmount = recipients.reduce((sum, r) => sum + (parseFloat(r.amount_kes) || 0), 0);

  const createBatch = useMutation({
    mutationFn: async () => {
      // Validate recipients
      for (const r of recipients) {
        if (!r.recipient_name || !r.phone_number || !r.amount_kes) {
          throw new Error("All recipient fields are required");
        }
        if (!isValidMpesaPhone(r.phone_number)) {
          throw new Error(`Invalid phone number: ${r.phone_number}`);
        }
      }

      // Create batch
      const { data: batch, error: batchErr } = await supabase
        .from("cash_transfer_batches")
        .insert({
          org_id: orgId!,
          batch_name: batchForm.batch_name,
          grant_id: batchForm.grant_id || null,
          project_id: batchForm.project_id || null,
          total_recipients: recipients.length,
          total_amount_kes: totalAmount,
          status: "draft",
          created_by: user?.id,
        })
        .select()
        .single();
      if (batchErr) throw batchErr;

      // Create transfer records
      const transfers = recipients.map(r => ({
        org_id: orgId!,
        batch_id: batch.id,
        grant_id: batchForm.grant_id || null,
        project_id: batchForm.project_id || null,
        batch_name: batchForm.batch_name,
        beneficiary_id: r.beneficiary_id || null,
        recipient_name: r.recipient_name,
        phone_number: formatMpesaPhone(r.phone_number),
        amount_kes: parseFloat(r.amount_kes),
        purpose: batchForm.purpose || null,
        initiated_by: user?.id,
        status: "pending",
      }));

      const { error: txErr } = await supabase.from("cash_transfers").insert(transfers);
      if (txErr) throw txErr;

      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-transfer-batches"] });
      toast.success("Transfer batch created");
      setCreateOpen(false);
      setBatchForm({ batch_name: "", grant_id: "", project_id: "", purpose: "" });
      setRecipients([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveBatch = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase.from("cash_transfer_batches").update({
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      }).eq("id", batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-transfer-batches"] });
      toast.success("Batch approved");
    },
  });

  const fmtAmount = (val: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);

  const pendingBatches = (batches.data || []).filter(b => b.status === "draft");
  const allBatches = batches.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Transfers</h1>
          <p className="text-sm text-muted-foreground mt-1">M-Pesa B2C cash transfer management</p>
        </div>
      </div>

      {/* Sandbox Banner */}
      <Card className="border-[var(--status-warning)]/40 bg-[var(--status-warning-bg)] dark:border-[var(--status-warning)]/40">
        <CardContent className="flex items-center gap-3 py-3">
          <AlertTriangle className="h-5 w-5 text-[var(--status-warning)]" />
          <p className="text-sm text-[var(--status-warning)]">
            M-Pesa is in sandbox mode. Configure production credentials in Settings to go live.
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="new-batch">New Batch</TabsTrigger>
          <TabsTrigger value="pending">Pending Approval ({pendingBatches.length})</TabsTrigger>
          <TabsTrigger value="history">Transfer History</TabsTrigger>
        </TabsList>

        <TabsContent value="new-batch" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Create Transfer Batch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Batch Name *</Label>
                  <Input value={batchForm.batch_name} onChange={e => setBatchForm(f => ({ ...f, batch_name: e.target.value }))} placeholder="e.g. Jan 2026 Stipends" />
                </div>
                <div>
                  <Label>Purpose</Label>
                  <Input value={batchForm.purpose} onChange={e => setBatchForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Monthly stipend" />
                </div>
                <div>
                  <Label>Link to Grant</Label>
                  <Select value={batchForm.grant_id} onValueChange={v => setBatchForm(f => ({ ...f, grant_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select grant" /></SelectTrigger>
                    <SelectContent>
                      {(grants.data || []).map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.grant_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Link to Project</Label>
                  <Select value={batchForm.project_id} onValueChange={v => setBatchForm(f => ({ ...f, project_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {(projects.data || []).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Recipients</Label>
                  <Button size="sm" variant="outline" onClick={addRecipient}><Plus className="h-4 w-4 mr-1" /> Add Recipient</Button>
                </div>

                {recipients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No recipients added yet. Click "Add Recipient" to start.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone (M-Pesa)</TableHead>
                        <TableHead>Amount (KES)</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Input value={r.recipient_name} onChange={e => updateRecipient(i, "recipient_name", e.target.value)} placeholder="Full Name" />
                          </TableCell>
                          <TableCell>
                            <Input value={r.phone_number} onChange={e => updateRecipient(i, "phone_number", e.target.value)} placeholder="07XXXXXXXX" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={r.amount_kes} onChange={e => updateRecipient(i, "amount_kes", e.target.value)} placeholder="0" />
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" onClick={() => removeRecipient(i)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {recipients.length > 0 && (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <span className="text-sm font-medium">Total: {recipients.length} recipients</span>
                    <span className="text-sm font-bold">{fmtAmount(totalAmount)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" disabled={recipients.length === 0 || !batchForm.batch_name} onClick={() => createBatch.mutate()}>
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {pendingBatches.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No pending batches</CardContent></Card>
          ) : pendingBatches.map(b => (
            <Card key={b.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{b.batch_name}</p>
                  <p className="text-xs text-muted-foreground">{b.total_recipients} recipients · {fmtAmount(Number(b.total_amount_kes))}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approveBatch.mutate(b.id)}><Check className="h-4 w-4 mr-1" /> Approve</Button>
                  <Button size="sm" variant="destructive"><X className="h-4 w-4 mr-1" /> Reject</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Batch</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBatches.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.batch_name}</TableCell>
                      <TableCell>{b.total_recipients}</TableCell>
                      <TableCell>{fmtAmount(Number(b.total_amount_kes))}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[b.status || 'draft']}>{b.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(b.created_at).toLocaleDateString('en-KE')}</TableCell>
                    </TableRow>
                  ))}
                  {allBatches.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No transfer history</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
