import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Plus, DollarSign, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, isPast, addDays } from "date-fns";

export function FundingSchedulesTab() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;
  const [addOpen, setAddOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState<string | null>(null);

  const [form, setForm] = useState({
    donor_name: "", amount: "", currency: "KES", frequency: "monthly",
    start_date: "", end_date: "", notes: "", auto_create_expense: false,
  });
  const [receiptForm, setReceiptForm] = useState({ amount_received: "", received_date: "", reference: "", notes: "" });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["funding-schedules", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("funding_schedules")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("next_due_date");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createSchedule = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("funding_schedules").insert({
        org_id: orgId,
        donor_name: payload.donor_name,
        amount: parseFloat(payload.amount),
        currency: payload.currency,
        frequency: payload.frequency,
        start_date: payload.start_date,
        end_date: payload.end_date || null,
        next_due_date: payload.start_date,
        auto_create_expense: payload.auto_create_expense,
        notes: payload.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funding-schedules"] });
      setAddOpen(false);
      setForm({ donor_name: "", amount: "", currency: "KES", frequency: "monthly", start_date: "", end_date: "", notes: "", auto_create_expense: false });
      toast.success("Funding schedule created");
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const recordReceipt = useMutation({
    mutationFn: async ({ scheduleId, ...payload }: any) => {
      const { error } = await supabase.from("funding_schedule_receipts").insert({
        schedule_id: scheduleId,
        amount_received: parseFloat(payload.amount_received),
        currency: "KES",
        received_date: payload.received_date,
        reference: payload.reference || null,
        notes: payload.notes || null,
        recorded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funding-schedules"] });
      setReceiptOpen(null);
      setReceiptForm({ amount_received: "", received_date: "", reference: "", notes: "" });
      toast.success("Receipt recorded");
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const getStatus = (nextDue: string) => {
    const due = new Date(nextDue);
    const today = new Date();
    if (isPast(due)) return { label: "Overdue", variant: "destructive" as const };
    if (due <= addDays(today, 14)) return { label: "Due Soon", variant: "outline" as const };
    return { label: "Upcoming", variant: "secondary" as const };
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Funding Schedules</h3>
        <Sheet open={addOpen} onOpenChange={setAddOpen}>
          <SheetTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Schedule</Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader><SheetTitle>New Funding Schedule</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Donor Name *</Label><Input value={form.donor_name} onChange={e => setForm(p => ({ ...p, donor_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
                <div><Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["KES","USD","EUR","GBP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Frequency *</Label>
                <Select value={form.frequency} onValueChange={v => setForm(p => ({ ...p, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["monthly","quarterly","biannual","annual","one_off"].map(f => <SelectItem key={f} value={f}>{f.replace("_"," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.auto_create_expense} onCheckedChange={v => setForm(p => ({ ...p, auto_create_expense: v }))} />
                <Label>Auto-create expense on receipt</Label>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
              <Button className="w-full" onClick={() => createSchedule.mutate(form)} disabled={!form.donor_name || !form.amount || !form.start_date || createSchedule.isPending}>
                {createSchedule.isPending ? "Creating..." : "Create Schedule"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="workspace-card">
          <CardContent className="p-4 text-center">
            <CalendarDays className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">{schedules.length}</p>
            <p className="text-xs text-muted-foreground">Active Schedules</p>
          </CardContent>
        </Card>
        <Card className="workspace-card">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{schedules.filter(s => isPast(new Date(s.next_due_date))).length}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className="workspace-card">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-success" />
            <p className="text-2xl font-bold text-foreground">{fmt(schedules.reduce((s, x) => s + Number(x.amount), 0))}</p>
            <p className="text-xs text-muted-foreground">Total Expected</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="workspace-card">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : schedules.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No funding schedules yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map(s => {
                  const status = getStatus(s.next_due_date);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.donor_name}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(s.amount))}</TableCell>
                      <TableCell className="capitalize text-sm">{s.frequency.replace("_", " ")}</TableCell>
                      <TableCell className="text-sm">{format(new Date(s.next_due_date), "dd MMM yyyy")}</TableCell>
                      <TableCell><Badge variant={status.variant} className="text-xs">{status.label}</Badge></TableCell>
                      <TableCell>
                        <Sheet open={receiptOpen === s.id} onOpenChange={v => setReceiptOpen(v ? s.id : null)}>
                          <SheetTrigger asChild>
                            <Button variant="outline" size="sm"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Record</Button>
                          </SheetTrigger>
                          <SheetContent>
                            <SheetHeader><SheetTitle>Record Receipt — {s.donor_name}</SheetTitle></SheetHeader>
                            <div className="space-y-4 mt-4">
                              <div><Label>Amount Received *</Label><Input type="number" value={receiptForm.amount_received} onChange={e => setReceiptForm(p => ({ ...p, amount_received: e.target.value }))} /></div>
                              <div><Label>Date Received *</Label><Input type="date" value={receiptForm.received_date} onChange={e => setReceiptForm(p => ({ ...p, received_date: e.target.value }))} /></div>
                              <div><Label>Reference</Label><Input value={receiptForm.reference} onChange={e => setReceiptForm(p => ({ ...p, reference: e.target.value }))} placeholder="Bank ref / receipt #" /></div>
                              <div><Label>Notes</Label><Textarea value={receiptForm.notes} onChange={e => setReceiptForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
                              <Button className="w-full" onClick={() => recordReceipt.mutate({ scheduleId: s.id, ...receiptForm })} disabled={!receiptForm.amount_received || !receiptForm.received_date || recordReceipt.isPending}>
                                {recordReceipt.isPending ? "Recording..." : "Record Receipt"}
                              </Button>
                            </div>
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
