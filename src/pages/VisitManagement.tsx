import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const STAGES = [
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "scheduled", label: "Scheduled" },
  { key: "conducted", label: "Conducted" },
  { key: "completed", label: "Feedback" },
];

export default function VisitManagement() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const [scheduleFor, setScheduleFor] = useState<any>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [feedbackFor, setFeedbackFor] = useState<any>(null);
  const [feedback, setFeedback] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["visit-requests", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("visit_requests")
        .select("*, beneficiary:beneficiaries(id, display_name), donor:donor_accounts(id, donor_name)")
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const transition = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await (supabase as any).from("visit_requests").update({ ...patch, updated_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["visit-requests", orgId] }); toast.success("Updated"); },
  });

  const grouped = STAGES.map(s => ({ ...s, items: requests.filter((r: any) => r.status === s.key) }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><CalendarClock className="h-8 w-8 text-primary" /> Visit Management</h1>
        <p className="text-muted-foreground">Review, approve and schedule donor visit requests.</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {grouped.map(stage => (
          <Card key={stage.key}>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between">{stage.label}<Badge variant="outline">{stage.items.length}</Badge></CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {stage.items.map((r: any) => (
                <div key={r.id} className="border rounded-md p-2 space-y-1">
                  <div className="text-sm font-medium">{r.beneficiary?.display_name || "Beneficiary"}</div>
                  <div className="text-xs text-muted-foreground">{r.donor?.donor_name || "Donor"}</div>
                  {r.requested_date && <div className="text-xs">Preferred: {format(parseISO(r.requested_date), "MMM d, yyyy")}</div>}
                  {r.scheduled_date && <div className="text-xs">Scheduled: {format(parseISO(r.scheduled_date), "MMM d, yyyy")}</div>}
                  {r.purpose && <div className="text-xs italic text-muted-foreground line-clamp-2">"{r.purpose}"</div>}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {r.status === "requested" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: r.id, patch: { status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() } })}><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => transition.mutate({ id: r.id, patch: { status: "declined", reviewed_by: user?.id, reviewed_at: new Date().toISOString() } })}><XCircle className="h-3 w-3 mr-1" />Decline</Button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" onClick={() => { setScheduleFor(r); setScheduledAt(r.requested_date || ""); }}>Schedule</Button>
                    )}
                    {r.status === "scheduled" && (
                      <Button size="sm" onClick={() => transition.mutate({ id: r.id, patch: { status: "conducted" } })}>Mark conducted</Button>
                    )}
                    {r.status === "conducted" && (
                      <Button size="sm" onClick={() => { setFeedbackFor(r); setFeedback(""); }}>Add feedback</Button>
                    )}
                  </div>
                </div>
              ))}
              {stage.items.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!scheduleFor} onOpenChange={(o) => !o && setScheduleFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule visit</DialogTitle></DialogHeader>
          <div><Label>Scheduled date & time</Label><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleFor(null)}>Cancel</Button>
            <Button onClick={() => { transition.mutate({ id: scheduleFor.id, patch: { status: "scheduled", scheduled_date: new Date(scheduledAt).toISOString() } }); setScheduleFor(null); }}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!feedbackFor} onOpenChange={(o) => !o && setFeedbackFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Visit feedback</DialogTitle></DialogHeader>
          <Textarea rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Summary shared with the donor" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackFor(null)}>Cancel</Button>
            <Button onClick={() => { transition.mutate({ id: feedbackFor.id, patch: { status: "completed", visit_feedback: feedback, completed_at: new Date().toISOString() } }); setFeedbackFor(null); }}>Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}