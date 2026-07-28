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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Send, Check, X, Receipt, Trash2, Upload, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  approved: "bg-[var(--status-success-bg)] text-[var(--status-success)] dark:text-[var(--status-success)]",
  rejected: "bg-destructive/10 text-destructive",
  paid: "bg-[var(--status-success-bg)] text-[var(--status-success)] dark:text-[var(--status-success)]",
};

const CATEGORIES = ["transport", "accommodation", "meals", "supplies", "communication", "other"];

export default function ExpenseClaims() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;
  const [activeTab, setActiveTab] = useState("my-claims");
  const [claimOpen, setClaimOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [form, setForm] = useState({
    claim_title: "",
    claim_date: format(new Date(), "yyyy-MM-dd"),
    grant_id: "",
    project_id: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState<Array<{
    description: string;
    category: string;
    amount: string;
  }>>([]);

  const myClaims = useQuery({
    queryKey: ["my-expense-claims", orgId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_claims")
        .select("*")
        .eq("org_id", orgId!)
        .eq("staff_id", user!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!user,
  });

  const allClaims = useQuery({
    queryKey: ["all-expense-claims", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_claims")
        .select("*")
        .eq("org_id", orgId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && can.manageFinancials,
  });

  const grants = useQuery({
    queryKey: ["grants-list-ec", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grants").select("id, grant_name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const totalAmount = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const createClaim = useMutation({
    mutationFn: async (submit: boolean) => {
      if (!form.claim_title) throw new Error("Claim title is required");
      if (lineItems.length === 0) throw new Error("Add at least one line item");

      const { error } = await supabase.from("expense_claims").insert({
        org_id: orgId!,
        staff_id: user!.id,
        claim_title: form.claim_title,
        claim_date: form.claim_date,
        grant_id: form.grant_id || null,
        project_id: form.project_id || null,
        total_amount: totalAmount,
        currency: "KES",
        status: submit ? "submitted" : "draft",
        items: lineItems,
        submitted_at: submit ? new Date().toISOString() : null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-expense-claims"] });
      queryClient.invalidateQueries({ queryKey: ["all-expense-claims"] });
      toast.success("Expense claim saved");
      setClaimOpen(false);
      setForm({ claim_title: "", claim_date: format(new Date(), "yyyy-MM-dd"), grant_id: "", project_id: "", notes: "" });
      setLineItems([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateClaimStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const updates: any = { status };
      if (status === "approved") {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      } else if (status === "rejected") {
        updates.rejection_reason = reason;
      } else if (status === "paid") {
        updates.paid_at = new Date().toISOString();
      }
      const { error } = await supabase.from("expense_claims").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-expense-claims"] });
      queryClient.invalidateQueries({ queryKey: ["my-expense-claims"] });
      toast.success("Claim updated");
      setRejectOpen(null);
      setRejectReason("");
    },
  });

  const fmtAmount = (val: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);
  const pendingClaims = (allClaims.data || []).filter(c => c.status === "submitted");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expense Claims</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit and manage travel & expense claims</p>
        </div>
        <Sheet open={claimOpen} onOpenChange={setClaimOpen}>
          <SheetTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Claim</Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>New Expense Claim</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Claim Title *</Label>
                <Input value={form.claim_title} onChange={e => setForm(f => ({ ...f, claim_title: e.target.value }))} placeholder="e.g. Field visit to Kisumu" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.claim_date} onChange={e => setForm(f => ({ ...f, claim_date: e.target.value }))} />
              </div>
              <div>
                <Label>Link to Grant</Label>
                <Select value={form.grant_id} onValueChange={v => setForm(f => ({ ...f, grant_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {(grants.data || []).map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.grant_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Line Items</Label>
                  <Button size="sm" variant="outline" onClick={() => setLineItems(prev => [...prev, { description: "", category: "transport", amount: "" }])}>
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
                {lineItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input value={item.description} onChange={e => setLineItems(prev => prev.map((it, idx) => idx === i ? { ...it, description: e.target.value } : it))} placeholder="Description" />
                    </div>
                    <div className="w-28">
                      <Select value={item.category} onValueChange={v => setLineItems(prev => prev.map((it, idx) => idx === i ? { ...it, category: v } : it))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input type="number" value={item.amount} onChange={e => setLineItems(prev => prev.map((it, idx) => idx === i ? { ...it, amount: e.target.value } : it))} placeholder="KES" />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {lineItems.length > 0 && (
                  <div className="text-right font-bold text-sm">Total: {fmtAmount(totalAmount)}</div>
                )}
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => createClaim.mutate(false)} disabled={createClaim.isPending}>Save Draft</Button>
                <Button onClick={() => createClaim.mutate(true)} disabled={createClaim.isPending}>
                  <Send className="h-4 w-4 mr-2" /> Submit for Approval
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-claims">My Claims</TabsTrigger>
          {can.manageFinancials && <TabsTrigger value="pending">Pending ({pendingClaims.length})</TabsTrigger>}
          {can.manageFinancials && <TabsTrigger value="all">All Claims</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-claims" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                   <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {(myClaims.data || []).map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.claim_title}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(c.claim_date).toLocaleDateString('en-KE')}</TableCell>
                      <TableCell>{fmtAmount(Number(c.total_amount))}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[c.status || 'draft']}>{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(myClaims.data || []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No claims yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {can.manageFinancials && (
          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingClaims.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No pending claims</CardContent></Card>
            ) : pendingClaims.map(c => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{c.claim_title}</p>
                    <p className="text-xs text-muted-foreground">{fmtAmount(Number(c.total_amount))} · {new Date(c.claim_date).toLocaleDateString('en-KE')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateClaimStatus.mutate({ id: c.id, status: "approved" })}>
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejectOpen(c.id)}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Reject modal */}
            {rejectOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
                <Card className="w-96">
                  <CardHeader><CardTitle>Reject Claim</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection" />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setRejectOpen(null)}>Cancel</Button>
                      <Button variant="destructive" onClick={() => updateClaimStatus.mutate({ id: rejectOpen, status: "rejected", reason: rejectReason })}>Reject</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        )}

        {can.manageFinancials && (
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allClaims.data || []).map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.claim_title}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(c.claim_date).toLocaleDateString('en-KE')}</TableCell>
                        <TableCell>{fmtAmount(Number(c.total_amount))}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[c.status || 'draft']}>{c.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
