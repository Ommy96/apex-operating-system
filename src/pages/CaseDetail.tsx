import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, ClipboardList, Plus, AlertTriangle, MapPin, CheckCircle2,
  Clock, MessageSquare, ArrowRightLeft, FileText, User, LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useBeneficiaryCase, useCaseEntries, useCreateCaseEntry, useUpdateCase, useCompleteFollowUp,
  type EntryType, type CaseStatus, type CasePriority,
} from "@/hooks/useBeneficiaryCases";
import { useWorkManagement, useCaseTasks } from "@/hooks/useWorkManagement";
import { allowedCaseTransitions, type ManagedCaseStatus } from "@/lib/workManagement";
import { usePermissions } from "@/hooks/usePermissions";

const ENTRY_TYPES: { value: EntryType; label: string; icon: any }[] = [
  { value: "visit", label: "Visit", icon: MapPin },
  { value: "observation", label: "Observation", icon: MessageSquare },
  { value: "concern", label: "Concern", icon: AlertTriangle },
  { value: "referral", label: "Referral", icon: ArrowRightLeft },
  { value: "follow_up", label: "Follow-up", icon: Clock },
  { value: "service_delivered", label: "Service delivered", icon: CheckCircle2 },
  { value: "outcome_recorded", label: "Outcome", icon: CheckCircle2 },
  { value: "note", label: "Note", icon: FileText },
  { value: "status_change", label: "Status change", icon: ClipboardList },
];

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: kase, isLoading } = useBeneficiaryCase(id);
  const { data: entries, isLoading: entriesLoading } = useCaseEntries(id);
  const updateCase = useUpdateCase();
  const completeFollowUp = useCompleteFollowUp();
  const { can } = usePermissions();
  const { orgMembers, updateTaskStatus } = useWorkManagement();
  const { data: linkedTasks = [], isLoading: tasksLoading } = useCaseTasks(id);
  const [openEntry, setOpenEntry] = useState(false);
  const [closeStatus, setCloseStatus] = useState<CaseStatus | null>(null);
  const [closureReason, setClosureReason] = useState("");

  if (isLoading || !kase) return <div className="p-6 space-y-3"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 w-full" /></div>;

  const benefName = (kase.beneficiary?.display_name ?? `${kase.beneficiary?.first_name ?? ""} ${kase.beneficiary?.last_name ?? ""}`.trim()) || "Unknown";
  const nextStatuses = allowedCaseTransitions(kase.case_status as ManagedCaseStatus);
  const caseIsTerminal = ["closed", "resolved", "lost_to_follow_up"].includes(kase.case_status);
  const requestStatusChange = (next: CaseStatus) => {
    if (["closed", "resolved", "lost_to_follow_up"].includes(next)) {
      setCloseStatus(next);
      setClosureReason("");
      return;
    }
    updateCase.mutate({ id: kase.id, patch: { case_status: next } });
  };
  const confirmClosure = async () => {
    if (!closeStatus || !closureReason.trim()) return;
    try {
      await updateCase.mutateAsync({ id: kase.id, patch: { case_status: closeStatus, closure_reason: closureReason.trim() } });
      setCloseStatus(null);
    } catch {
      // The mutation reports the database validation message through its toast.
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/cases"><ArrowLeft className="h-4 w-4 mr-1" /> All cases</Link>
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-primary" /> {kase.case_number ?? "Case"}
              </h1>
              <Badge>{kase.case_status.replace(/_/g," ")}</Badge>
              <Badge variant="outline">{kase.case_type.replace(/_/g," ")}</Badge>
              <Badge className={kase.priority === "critical" ? "bg-destructive/10 text-destructive" : kase.priority === "high" ? "bg-warning/10 text-warning" : ""}>{kase.priority}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <User className="h-3 w-3" />
              <Link to={`/beneficiaries/${kase.beneficiary?.id}`} className="hover:underline">{benefName}</Link>
              {kase.beneficiary?.unique_id && <span>· {kase.beneficiary.unique_id}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!caseIsTerminal && <Select value={kase.case_status} onValueChange={(v) => requestStatusChange(v as CaseStatus)} disabled={updateCase.isPending}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={kase.case_status} disabled>{kase.case_status.replaceAll("_", " ")}</SelectItem>{nextStatuses.map((status) => <SelectItem key={status} value={status}>{status.replace(/_/g," ")}</SelectItem>)}</SelectContent>
            </Select>}
            {!caseIsTerminal && <Select value={kase.priority} onValueChange={(v) => updateCase.mutate({ id: kase.id, patch: { priority: v as CasePriority } })}>
              <SelectTrigger className="w-full sm:w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>{(["low","normal","high","critical"] as CasePriority[]).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>}
            {!caseIsTerminal && <Button onClick={() => setOpenEntry(true)}><Plus className="h-4 w-4 mr-1" /> Add entry</Button>}
          </div>
        </div>
        {kase.summary && <p className="text-sm mt-3 p-3 bg-muted/40 rounded-md">{kase.summary}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Assigned to</span>
          <Select value={kase.assigned_to || "unassigned"} onValueChange={(value) => updateCase.mutate({ id: kase.id, patch: { assigned_to: value === "unassigned" ? null : value } })} disabled={!can.manageCases || caseIsTerminal}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select staff" /></SelectTrigger>
            <SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{(orgMembers.data ?? []).map((member: any) => <SelectItem key={member.user_id} value={member.user_id}>{member.full_name || member.email}</SelectItem>)}</SelectContent>
          </Select>
          {kase.is_sensitive && <Badge variant="outline" className="gap-1"><LockKeyhole className="h-3 w-3" /> Sensitive</Badge>}
          {can.viewSensitiveCases && !caseIsTerminal && <label className="flex items-center gap-2"><Checkbox checked={kase.is_sensitive} onCheckedChange={(checked) => updateCase.mutate({ id: kase.id, patch: { is_sensitive: checked === true } })} /> Mark sensitive</label>}
        </div>
        {caseIsTerminal && <div className="mt-3 border-t pt-3 text-sm"><p className="font-medium">Case {kase.case_status.replaceAll("_", " ")}{kase.closed_date ? ` · ${kase.closed_date}` : ""}</p><p className="text-muted-foreground">{kase.closure_reason}</p></div>}
      </div>

      <CaseTasksPanel caseId={kase.id} tasks={linkedTasks} isLoading={tasksLoading} staff={orgMembers.data ?? []} canManage={can.manageTasks} canView={can.viewTasks} onStatusChange={(taskId, status) => updateTaskStatus.mutate({ id: taskId, status })} />

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Case timeline</CardTitle></CardHeader>
        <CardContent>
          {entriesLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !entries || entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet. Record visits, observations or referrals to build the case history.</p>
          ) : (
            <ol className="relative border-l border-muted pl-6 space-y-4">
              {entries.map((e) => {
                const meta = ENTRY_TYPES.find(t => t.value === e.entry_type);
                const Icon = meta?.icon ?? FileText;
                return (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full bg-background border">
                      <Icon className="h-3 w-3 text-primary" />
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="font-medium">{meta?.label ?? e.entry_type}</span>
                        <span className="text-xs text-muted-foreground">{e.entry_date}</span>
                        {e.concern_level && e.concern_level !== "none" && (
                          <Badge variant="outline" className="text-[10px]">{e.concern_level} concern</Badge>
                        )}
                        {e.follow_up_date && !e.follow_up_completed && (
                          <Badge className="bg-warning/10 text-warning text-[10px]">follow-up {e.follow_up_date}</Badge>
                        )}
                        {e.follow_up_completed && (
                          <Badge className="bg-success/10 text-success text-[10px]">follow-up done</Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{e.summary}</p>
                      {e.action_required && (
                        <p className="text-xs text-warning">Action: {e.action_required}</p>
                      )}
                      {(e.referral_to || e.referral_organisation) && (
                        <p className="text-xs text-info">Referred to {e.referral_to ?? "—"} {e.referral_organisation ? `(${e.referral_organisation})` : ""}</p>
                      )}
                      {e.follow_up_date && !e.follow_up_completed && (
                        <Button size="sm" variant="outline" onClick={() => completeFollowUp.mutate({ entryId: e.id, caseId: kase.id })}>
                          Mark follow-up complete
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <NewEntrySheet open={openEntry} onOpenChange={setOpenEntry} caseId={kase.id} beneficiaryId={kase.beneficiary_id} />
      <Dialog open={Boolean(closeStatus)} onOpenChange={(open) => { if (!open) setCloseStatus(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{closeStatus === "lost_to_follow_up" ? "Record follow-up outcome" : `Close case as ${closeStatus ?? ""}`}</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>Closure reason *</Label><Textarea value={closureReason} onChange={(event) => setClosureReason(event.target.value)} rows={4} placeholder="Record why this case is closing" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setCloseStatus(null)}>Cancel</Button><Button onClick={confirmClosure} disabled={!closureReason.trim() || updateCase.isPending}>Save closure</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CaseTasksPanel({ caseId, tasks, isLoading, staff, canManage, canView, onStatusChange }: { caseId: string; tasks: Array<{ id: string; title: string; status: string; priority: string; assigned_to: string | null; due_date: string | null; is_sensitive: boolean }>; isLoading: boolean; staff: any[]; canManage: boolean; canView: boolean; onStatusChange: (id: string, status: "todo" | "in_progress" | "blocked" | "completed" | "cancelled") => void }) {
  const { createTask } = useWorkManagement();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  if (!canView) return null;
  const saveTask = () => createTask.mutate({ title, assigned_to: assignee || undefined, due_date: dueDate || undefined, case_id: caseId }, { onSuccess: () => { setOpen(false); setTitle(""); setAssignee(""); setDueDate(""); } });
  return <Card>
    <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3"><CardTitle className="text-base">Tasks for this case</CardTitle>{canManage && <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add task</Button>}</CardHeader>
    <CardContent className="space-y-2">
      {isLoading ? <Skeleton className="h-16 w-full" /> : !tasks.length ? <p className="text-sm text-muted-foreground">No tasks linked to this case yet.</p> : tasks.map((task) => {
        const transitions = allowedTaskTransitions(task.status as "todo" | "in_progress" | "blocked" | "completed" | "cancelled");
        const assigned = staff.find((person: any) => person.user_id === task.assigned_to);
        return <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-0">
          <div className="min-w-0"><p className="truncate text-sm font-medium">{task.title}</p><p className="text-xs text-muted-foreground">{assigned?.full_name || "Unassigned"}{task.due_date ? ` · Due ${task.due_date}` : ""}{task.is_sensitive ? " · Sensitive" : ""}</p></div>
          <Select value={task.status} onValueChange={(value) => onStatusChange(task.id, value as "todo" | "in_progress" | "blocked" | "completed" | "cancelled")} disabled={transitions.length === 0}>
            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{transitions.length ? transitions.map((status) => <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>) : <SelectItem value={task.status} disabled>{task.status.replaceAll("_", " ")}</SelectItem>}</SelectContent>
          </Select>
        </div>;
      })}
    </CardContent>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add case task</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Task title *</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} /></div><div><Label>Assign to</Label><Select value={assignee || "unassigned"} onValueChange={(value) => setAssignee(value === "unassigned" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{staff.map((person: any) => <SelectItem key={person.user_id} value={person.user_id}>{person.full_name || person.email}</SelectItem>)}</SelectContent></Select></div><div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={saveTask} disabled={!title.trim() || createTask.isPending}>Create task</Button></DialogFooter></DialogContent></Dialog>
  </Card>;
}

function NewEntrySheet({ open, onOpenChange, caseId, beneficiaryId }: { open: boolean; onOpenChange: (o: boolean) => void; caseId: string; beneficiaryId: string }) {
  const create = useCreateCaseEntry();
  const [entryType, setEntryType] = useState<EntryType>("note");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0,10));
  const [summary, setSummary] = useState("");
  const [concernLevel, setConcernLevel] = useState<string>("none");
  const [actionRequired, setActionRequired] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [referralTo, setReferralTo] = useState("");
  const [referralOrg, setReferralOrg] = useState("");

  const reset = () => {
    setEntryType("note"); setSummary(""); setConcernLevel("none"); setActionRequired("");
    setFollowUpDate(""); setReferralTo(""); setReferralOrg(""); setEntryDate(new Date().toISOString().slice(0,10));
  };

  const handleSave = async () => {
    await create.mutateAsync({
      case_id: caseId,
      beneficiary_id: beneficiaryId,
      entry_type: entryType,
      entry_date: entryDate,
      summary,
      concern_level: concernLevel === "none" ? null : concernLevel,
      action_required: actionRequired || null,
      follow_up_date: followUpDate || null,
      referral_to: referralTo || null,
      referral_organisation: referralOrg || null,
    });
    onOpenChange(false);
    reset();
  };

  const isReferral = entryType === "referral";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>Record case entry</SheetTitle></SheetHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Entry type</Label>
              <Select value={entryType} onValueChange={(v) => setEntryType(v as EntryType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTRY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Entry date</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Summary *</Label>
            <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What happened?" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Concern level</Label>
              <Select value={concernLevel} onValueChange={setConcernLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["none","low","medium","high","critical"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Follow-up date</Label>
              <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Action required</Label>
            <Input value={actionRequired} onChange={(e) => setActionRequired(e.target.value)} placeholder="What action needs to happen next?" />
          </div>
          {isReferral && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Referred to (person)</Label>
                <Input value={referralTo} onChange={(e) => setReferralTo(e.target.value)} />
              </div>
              <div>
                <Label>Referral organisation</Label>
                <Input value={referralOrg} onChange={(e) => setReferralOrg(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!summary.trim() || create.isPending}>Save entry</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}