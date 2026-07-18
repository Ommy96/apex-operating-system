import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface Props {
  donorAccountId: string;
  organizationId: string;
}

export function DonorVisitRequestsTab({ donorAccountId, organizationId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ beneficiary_id: "", requested_date: "", purpose: "" });

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["donor-portal-beneficiaries", donorAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("beneficiary_donors")
        .select("beneficiary:beneficiaries(id, display_name)")
        .eq("donor_account_id", donorAccountId);
      return (data || []).map((r: any) => r.beneficiary).filter(Boolean);
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["donor-visit-requests", donorAccountId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("visit_requests")
        .select("*, beneficiary:beneficiaries(display_name)")
        .eq("donor_account_id", donorAccountId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("visit_requests").insert({
        organization_id: organizationId,
        donor_account_id: donorAccountId,
        beneficiary_id: form.beneficiary_id,
        requested_date: form.requested_date || null,
        purpose: form.purpose || null,
        status: "requested",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Visit request submitted"); setOpen(false); setForm({ beneficiary_id: "", requested_date: "", purpose: "" }); qc.invalidateQueries({ queryKey: ["donor-visit-requests", donorAccountId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const statusVariant = (s: string) => s === "declined" ? "destructive" : s === "completed" ? "default" : "secondary";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">My visit requests</h3>
        <Button onClick={() => setOpen(true)}><CalendarPlus className="h-4 w-4 mr-1" /> Request visit</Button>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-2">
          {requests.length === 0 && <p className="text-sm text-muted-foreground">You haven't requested any visits yet.</p>}
          {requests.map((r: any) => (
            <div key={r.id} className="border rounded-md p-3 flex items-start justify-between">
              <div>
                <div className="font-medium text-sm">{r.beneficiary?.display_name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.requested_date && `Preferred: ${format(parseISO(r.requested_date), "MMM d, yyyy")}`}
                  {r.scheduled_date && ` · Scheduled: ${format(parseISO(r.scheduled_date), "MMM d, yyyy")}`}
                </div>
                {r.purpose && <p className="text-sm mt-1">{r.purpose}</p>}
                {r.visit_feedback && <p className="text-sm mt-2 italic border-l-2 pl-2">{r.visit_feedback}</p>}
              </div>
              <Badge variant={statusVariant(r.status) as any} className="capitalize">{r.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request a visit</DialogTitle><DialogDescription>Staff will review and confirm scheduling.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Beneficiary</Label>
              <Select value={form.beneficiary_id} onValueChange={(v) => setForm({ ...form, beneficiary_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {beneficiaries.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Preferred date</Label><Input type="date" value={form.requested_date} onChange={(e) => setForm({ ...form, requested_date: e.target.value })} /></div>
            <div><Label>Purpose (optional)</Label><Textarea rows={3} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.beneficiary_id || create.isPending} onClick={() => create.mutate()}>Submit request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}