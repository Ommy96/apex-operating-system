import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar, HandCoins, MapPin, User, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_CLS: Record<string, string> = {
  planned: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const DISBURSEMENT_KINDS = [
  "cash", "school_fees", "textbook", "uniform", "food_kit",
  "medical", "agricultural_input", "hygiene_kit", "transport", "rent", "other",
];

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;

  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activities")
        .select("*, projects(id, name), programs(id, name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useDocumentTitle((activity as any)?.name ?? null);

  const { data: participants = [] } = useQuery({
    queryKey: ["activity-participants", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activity_participants")
        .select("id, beneficiary_id, attendance_status, arrival_at, notes, beneficiaries(id, display_name, beneficiary_code)")
        .eq("activity_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && activity?.type === "event",
  });

  const { data: disbursements = [] } = useQuery({
    queryKey: ["activity-disbursements", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activity_disbursements")
        .select("id, beneficiary_id, kind, quantity, unit, monetary_value, currency, reference_no, notes, disbursed_at, beneficiaries(id, display_name, beneficiary_code)")
        .eq("activity_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && activity?.type === "disbursement",
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const patch: any = { status };
      if (status === "completed") patch.completed_at = new Date().toISOString();
      const { error } = await (supabase as any).from("activities").update(patch).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity", id] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="container mx-auto p-6"><Skeleton className="h-40 w-full" /></div>;
  if (!activity) return <div className="container mx-auto p-6 text-muted-foreground">Activity not found.</div>;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {activity.type === "disbursement"
                  ? <HandCoins className="h-5 w-5 text-warning" />
                  : <Calendar className="h-5 w-5 text-info" />}
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{activity.type}</span>
                <Badge variant="secondary" className={`text-[10px] capitalize ${STATUS_CLS[activity.status] || ""}`}>
                  {activity.status?.replace("_", " ")}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold">{activity.name}</h1>
              {activity.description && <p className="text-sm text-muted-foreground mt-2">{activity.description}</p>}
            </div>
            <Select value={activity.status} onValueChange={(v) => updateStatus.mutate(v)}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Project</div>
              {activity.projects ? (
                <Link to={`/projects/dashboard/${activity.projects.id}`} className="text-primary hover:underline">{activity.projects.name}</Link>
              ) : "—"}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Scheduled</div>
              <div>{activity.scheduled_at ? format(new Date(activity.scheduled_at), "dd MMM yyyy HH:mm") : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</div>
              <div>{activity.location || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Facilitator</div>
              <div>{activity.facilitator_name || "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {activity.type === "event" ? (
        <ParticipantsPanel activityId={id!} orgId={orgId} userId={user?.id} participants={participants} onChange={() => qc.invalidateQueries({ queryKey: ["activity-participants", id] })} />
      ) : (
        <DisbursementsPanel activityId={id!} orgId={orgId} userId={user?.id} disbursements={disbursements} onChange={() => qc.invalidateQueries({ queryKey: ["activity-disbursements", id] })} />
      )}
    </div>
  );
}

function BeneficiaryPicker({ orgId, value, onChange }: { orgId?: string; value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState("");
  const { data: list = [] } = useQuery({
    queryKey: ["beneficiary-picker", orgId, search],
    queryFn: async () => {
      let q = supabase.from("beneficiaries").select("id, display_name, beneficiary_code").eq("organization_id", orgId!).is("deleted_at", null).limit(50);
      if (search) q = q.ilike("display_name", `%${search}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: !!orgId,
  });
  return (
    <div className="space-y-2">
      <Input placeholder="Search beneficiary…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select beneficiary" /></SelectTrigger>
        <SelectContent>
          {list.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.display_name} {b.beneficiary_code ? `(${b.beneficiary_code})` : ""}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ParticipantsPanel({ activityId, orgId, userId, participants, onChange }: any) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState("");

  const add = async () => {
    if (!pick) return;
    const { error } = await (supabase as any).from("activity_participants").insert({
      activity_id: activityId, beneficiary_id: pick, organization_id: orgId, attendance_status: "expected", recorded_by: userId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Participant added");
    setPick(""); setOpen(false); onChange();
  };

  const toggleAttended = async (p: any) => {
    const next = p.attendance_status === "attended" ? "expected" : "attended";
    const patch: any = { attendance_status: next };
    if (next === "attended") patch.arrival_at = new Date().toISOString();
    const { error } = await (supabase as any).from("activity_participants").update(patch).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    onChange();
  };

  const remove = async (pid: string) => {
    const { error } = await (supabase as any).from("activity_participants").delete().eq("id", pid);
    if (error) { toast.error(error.message); return; }
    onChange();
  };

  const attended = participants.filter((p: any) => p.attendance_status === "attended").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Participants <span className="text-xs text-muted-foreground font-normal ml-2">{attended} of {participants.length} attended</span></CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add participant</DialogTitle></DialogHeader>
            <BeneficiaryPicker orgId={orgId} value={pick} onChange={setPick} />
            <Button onClick={add} disabled={!pick}>Add participant</Button>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {participants.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No participants yet.</div>
        ) : (
          <div className="divide-y">
            {participants.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Checkbox checked={p.attendance_status === "attended"} onCheckedChange={() => toggleAttended(p)} />
                <div className="flex-1 min-w-0">
                  <Link to={`/beneficiaries/${p.beneficiary_id}`} className="text-sm font-medium hover:underline">
                    {p.beneficiaries?.display_name || "Beneficiary"}
                  </Link>
                  <div className="text-xs text-muted-foreground">{p.beneficiaries?.beneficiary_code || ""}</div>
                </div>
                {p.attendance_status === "attended" && <CheckCircle2 className="h-4 w-4 text-success" />}
                <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DisbursementsPanel({ activityId, orgId, userId, disbursements, onChange }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ beneficiary_id: "", kind: "cash", quantity: "", unit: "", monetary_value: "", currency: "KES", reference_no: "", notes: "" });

  const add = async () => {
    if (!form.beneficiary_id) { toast.error("Pick a beneficiary"); return; }
    const payload: any = {
      activity_id: activityId, beneficiary_id: form.beneficiary_id, organization_id: orgId,
      kind: form.kind, quantity: form.quantity ? Number(form.quantity) : null, unit: form.unit || null,
      monetary_value: form.monetary_value ? Number(form.monetary_value) : null, currency: form.currency || null,
      reference_no: form.reference_no || null, notes: form.notes || null,
      disbursed_at: new Date().toISOString(), recorded_by: userId,
    };
    const { error } = await (supabase as any).from("activity_disbursements").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Disbursement recorded");
    setForm({ beneficiary_id: "", kind: "cash", quantity: "", unit: "", monetary_value: "", currency: "KES", reference_no: "", notes: "" });
    setOpen(false); onChange();
  };

  const remove = async (did: string) => {
    const { error } = await (supabase as any).from("activity_disbursements").delete().eq("id", did);
    if (error) { toast.error(error.message); return; }
    onChange();
  };

  const total = disbursements.reduce((s: number, d: any) => s + (Number(d.monetary_value) || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Disbursements <span className="text-xs text-muted-foreground font-normal ml-2">{disbursements.length} records · {total.toLocaleString()} total</span></CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Record disbursement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <BeneficiaryPicker orgId={orgId} value={form.beneficiary_id} onChange={(v) => setForm((p) => ({ ...p, beneficiary_id: v }))} />
              <div>
                <Label>Kind</Label>
                <Select value={form.kind} onValueChange={(v) => setForm((p) => ({ ...p, kind: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISBURSEMENT_KINDS.map(k => <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} /></div>
                <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} placeholder="e.g. kg, set" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><Label>Monetary value</Label><Input type="number" value={form.monetary_value} onChange={(e) => setForm((p) => ({ ...p, monetary_value: e.target.value }))} /></div>
                <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} /></div>
              </div>
              <div><Label>Reference no</Label><Input value={form.reference_no} onChange={(e) => setForm((p) => ({ ...p, reference_no: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={add} className="w-full">Record disbursement</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {disbursements.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No disbursements yet.</div>
        ) : (
          <div className="divide-y">
            {disbursements.map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 rounded bg-warning/10 flex items-center justify-center"><HandCoins className="h-4 w-4 text-warning" /></div>
                <div className="flex-1 min-w-0">
                  <Link to={`/beneficiaries/${d.beneficiary_id}`} className="text-sm font-medium hover:underline">
                    {d.beneficiaries?.display_name || "Beneficiary"}
                  </Link>
                  <div className="text-xs text-muted-foreground capitalize">
                    {String(d.kind).replace(/_/g, " ")}
                    {d.quantity ? ` · ${d.quantity} ${d.unit || ""}` : ""}
                    {d.monetary_value ? ` · ${d.currency || ""} ${Number(d.monetary_value).toLocaleString()}` : ""}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}