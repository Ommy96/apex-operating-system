import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, ClipboardList, Plus, AlertTriangle, MapPin, CheckCircle2,
  Clock, MessageSquare, ArrowRightLeft, FileText, User,
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
import {
  useBeneficiaryCase, useCaseEntries, useCreateCaseEntry, useUpdateCase, useCompleteFollowUp,
  type EntryType, type CaseStatus, type CasePriority,
} from "@/hooks/useBeneficiaryCases";

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
  const [openEntry, setOpenEntry] = useState(false);

  if (isLoading || !kase) return <div className="p-6 space-y-3"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 w-full" /></div>;

  const benefName = (kase.beneficiary?.display_name ?? `${kase.beneficiary?.first_name ?? ""} ${kase.beneficiary?.last_name ?? ""}`.trim()) || "Unknown";

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
              <Badge className={kase.priority === "critical" ? "bg-rose-100 text-rose-700" : kase.priority === "high" ? "bg-amber-100 text-amber-700" : ""}>{kase.priority}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <User className="h-3 w-3" />
              <Link to={`/beneficiaries/${kase.beneficiary?.id}`} className="hover:underline">{benefName}</Link>
              {kase.beneficiary?.unique_id && <span>· {kase.beneficiary.unique_id}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={kase.case_status} onValueChange={(v) => updateCase.mutate({ id: kase.id, patch: { case_status: v as CaseStatus } })}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["open","in_progress","referred","resolved","closed","lost_to_follow_up"] as CaseStatus[]).map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={kase.priority} onValueChange={(v) => updateCase.mutate({ id: kase.id, patch: { priority: v as CasePriority } })}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["low","normal","high","critical"] as CasePriority[]).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setOpenEntry(true)}><Plus className="h-4 w-4 mr-1" /> Add entry</Button>
          </div>
        </div>
        {kase.summary && <p className="text-sm mt-3 p-3 bg-muted/40 rounded-md">{kase.summary}</p>}
      </div>

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
                          <Badge className="bg-amber-100 text-amber-700 text-[10px]">follow-up {e.follow_up_date}</Badge>
                        )}
                        {e.follow_up_completed && (
                          <Badge className="bg-teal-100 text-teal-700 text-[10px]">follow-up done</Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{e.summary}</p>
                      {e.action_required && (
                        <p className="text-xs text-amber-700">Action: {e.action_required}</p>
                      )}
                      {(e.referral_to || e.referral_organisation) && (
                        <p className="text-xs text-purple-700">Referred to {e.referral_to ?? "—"} {e.referral_organisation ? `(${e.referral_organisation})` : ""}</p>
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
    </div>
  );
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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