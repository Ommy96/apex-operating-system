import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Calculator, HandCoins, GraduationCap, X, ArrowRight } from "lucide-react";
import {
  useWaitlist, useUpsertWaitlist, useScoreWaitlist, useTransitionWaitlist, useMatchAndEnroll, useProjectsForNeed,
  WAITLIST_STAGES, type WaitlistApplication, type WaitlistStatus,
} from "@/hooks/useWaitlist";
import { useSponsorshipPackages } from "@/hooks/useSponsorshipPackages";
import { useNeedTypes } from "@/hooks/useNeeds";
import { formatMoney } from "@/lib/allocationEngine";

function applicantName(a: WaitlistApplication) {
  const b = (a as any).beneficiaries;
  return b?.display_name || [b?.first_name, b?.last_name].filter(Boolean).join(" ") || a.applicant_name || "Unnamed applicant";
}

type DraftNeed = { need_type_id: string; estimated_cost: string; priority: 'low' | 'normal' | 'high' | 'urgent' };
const PRIORITY_STYLE: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-slate-100 text-slate-700',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function WaitlistManagement() {
  const { data: apps = [], isLoading } = useWaitlist();
  const { data: packages = [] } = useSponsorshipPackages();
  const { data: needTypes = [] } = useNeedTypes(false);
  const upsert = useUpsertWaitlist();
  const score = useScoreWaitlist();
  const transition = useTransitionWaitlist();
  const enroll = useMatchAndEnroll();

  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({
    applicant_name: "", applicant_age: "", applicant_location: "",
    applicant_notes: "", guardian_contact: "",
  });
  const [draftNeeds, setDraftNeeds] = useState<DraftNeed[]>([]);
  const [matchFor, setMatchFor] = useState<WaitlistApplication | null>(null);
  const [matchPackageId, setMatchPackageId] = useState<string>("");
  const [matchProjectId, setMatchProjectId] = useState<string>("");
  const [donorName, setDonorName] = useState("");

  // Suggest the top need's type when opening match dialog to prioritise projects
  const topNeedTypeId = useMemo(() => {
    if (!matchFor) return undefined;
    const needs = ((matchFor as any).needs || []) as any[];
    const order = { urgent: 3, high: 2, normal: 1, low: 0 } as any;
    return [...needs].sort((a, b) => (order[b.priority] || 0) - (order[a.priority] || 0))[0]?.need_type_id;
  }, [matchFor]);
  const { data: projects = [] } = useProjectsForNeed(topNeedTypeId);

  // Default the project to one addressing the top need
  const sortedProjects = useMemo(() => {
    if (!topNeedTypeId) return projects;
    return [...projects].sort((a, b) =>
      Number(b.addresses_need_type_id === topNeedTypeId) - Number(a.addresses_need_type_id === topNeedTypeId),
    );
  }, [projects, topNeedTypeId]);

  const grouped = useMemo(() => {
    const g: Record<WaitlistStatus, WaitlistApplication[]> = {
      application: [], assessment: [], scoring: [], waiting_list: [],
      funding_match: [], enrolled: [], declined: [],
    };
    for (const a of apps) g[a.status]?.push(a);
    // Sort each column by vulnerability score desc
    (Object.keys(g) as WaitlistStatus[]).forEach((k) =>
      g[k].sort((a, b) => b.vulnerability_score - a.vulnerability_score));
    return g;
  }, [apps]);

  const addDraftNeed = () => {
    const unused = needTypes.find((t) => !draftNeeds.some((d) => d.need_type_id === t.id));
    if (!unused) return;
    setDraftNeeds((p) => [
      ...p,
      { need_type_id: unused.id, estimated_cost: unused.default_cost?.toString() || "", priority: 'normal' },
    ]);
  };

  const resetForm = () => {
    setForm({ applicant_name: "", applicant_age: "", applicant_location: "", applicant_notes: "", guardian_contact: "" });
    setDraftNeeds([]);
  };

  const submitNew = async () => {
    if (!form.applicant_name.trim()) return;
    try {
      await upsert.mutateAsync({
        applicant_name: form.applicant_name,
        applicant_age: form.applicant_age ? Number(form.applicant_age) : null,
        applicant_location: form.applicant_location || null,
        applicant_notes: form.applicant_notes || null,
        guardian_contact: form.guardian_contact || null,
        status: "application",
        vulnerability_score: 0,
        needs: draftNeeds
          .filter((d) => d.need_type_id)
          .map((d) => ({
            need_type_id: d.need_type_id,
            estimated_cost: d.estimated_cost ? Number(d.estimated_cost) : null,
            priority: d.priority,
          })),
      });
      setNewOpen(false);
      resetForm();
    } catch { /* toast handled */ }
  };

  const submitMatch = async () => {
    if (!matchFor) return;
    if (!matchProjectId) {
      // eslint-disable-next-line no-alert
      return;
    }
    const pkg = matchPackageId ? packages.find((p) => p.id === matchPackageId) : undefined;
    try {
      await enroll.mutateAsync({
        application: matchFor,
        projectId: matchProjectId,
        packageId: pkg?.id,
        packageCost: pkg?.monthly_cost,
        donorName: donorName || undefined,
      });
      setMatchFor(null);
      setMatchPackageId("");
      setMatchProjectId("");
      setDonorName("");
    } catch { /* toast handled */ }
  };

  const openMatch = (a: WaitlistApplication) => {
    setMatchFor(a);
    setMatchPackageId("");
    setMatchProjectId(a.project_id || "");
    setDonorName("");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Waiting list
          </h1>
          <p className="text-sm text-muted-foreground">
            Applicants ranked by vulnerability and unmet need. Enrolling creates the beneficiary, needs, and (if matched) sponsorship in one step.
          </p>
        </div>
        <Dialog open={newOpen} onOpenChange={(o) => { setNewOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New application</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New waitlist application</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Applicant name</Label>
                <Input value={form.applicant_name} onChange={(e) => setForm({ ...form, applicant_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Age</Label>
                  <Input type="number" value={form.applicant_age} onChange={(e) => setForm({ ...form, applicant_age: e.target.value })} /></div>
                <div><Label>Location</Label>
                  <Input value={form.applicant_location} onChange={(e) => setForm({ ...form, applicant_location: e.target.value })} /></div>
              </div>
              <div><Label>Guardian contact</Label>
                <Input value={form.guardian_contact} onChange={(e) => setForm({ ...form, guardian_contact: e.target.value })} /></div>
              <div><Label>Notes</Label>
                <Textarea value={form.applicant_notes} onChange={(e) => setForm({ ...form, applicant_notes: e.target.value })} placeholder="Orphan status, disability, single-parent household…" /></div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label>Needs</Label>
                  <Button type="button" size="sm" variant="outline"
                    onClick={addDraftNeed}
                    disabled={draftNeeds.length >= needTypes.length}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add need
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  What support does this applicant require? Drives ranking and later beneficiary needs.
                </p>
                {draftNeeds.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No needs added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {draftNeeds.map((d, i) => {
                      const available = needTypes.filter(
                        (t) => t.id === d.need_type_id || !draftNeeds.some((x) => x.need_type_id === t.id),
                      );
                      return (
                        <div key={i} className="grid grid-cols-[1fr_100px_110px_28px] gap-2 items-center">
                          <Select value={d.need_type_id} onValueChange={(v) => {
                            const t = needTypes.find((x) => x.id === v);
                            setDraftNeeds((p) => p.map((x, idx) => idx === i
                              ? { ...x, need_type_id: v, estimated_cost: x.estimated_cost || (t?.default_cost?.toString() || "") }
                              : x));
                          }}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Need type" /></SelectTrigger>
                            <SelectContent>
                              {available.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input type="number" placeholder="Cost" value={d.estimated_cost} className="h-8 text-xs"
                            onChange={(e) => setDraftNeeds((p) => p.map((x, idx) => idx === i ? { ...x, estimated_cost: e.target.value } : x))} />
                          <Select value={d.priority} onValueChange={(v) => setDraftNeeds((p) => p.map((x, idx) => idx === i ? { ...x, priority: v as any } : x))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => setDraftNeeds((p) => p.filter((_, idx) => idx !== i))}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setNewOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={submitNew} disabled={upsert.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {WAITLIST_STAGES.map((stage) => (
            <Card key={stage.key} className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                  {stage.label}
                  <Badge variant="secondary" className="text-[10px]">{grouped[stage.key].length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {grouped[stage.key].length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Empty</p>
                ) : grouped[stage.key].map((a) => {
                  const needs = ((a as any).needs || []) as any[];
                  const explanation = a.score_details?.explanation as string | undefined;
                  const isEnrolled = a.status === "enrolled";
                  const beneficiary = (a as any).beneficiaries;
                  return (
                    <div key={a.id} className="rounded-md border bg-background p-2 text-xs space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium">{applicantName(a)}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">Score {a.vulnerability_score}</Badge>
                      </div>
                      {a.applicant_age != null && (
                        <div className="text-muted-foreground">Age {a.applicant_age}{a.applicant_location ? ` · ${a.applicant_location}` : ""}</div>
                      )}
                      {needs.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {needs.map((n) => (
                            <span key={n.id} className={`px-1.5 py-0.5 rounded text-[10px] ${PRIORITY_STYLE[n.priority] || ''}`}
                              title={n.estimated_cost ? `${n.currency || 'KES'} ${Number(n.estimated_cost).toLocaleString()}` : ''}>
                              {n.need_type?.label || 'Need'}
                            </span>
                          ))}
                        </div>
                      )}
                      {explanation && (
                        <div className="text-[10px] text-muted-foreground italic">{explanation}</div>
                      )}
                      {isEnrolled && beneficiary?.id && (
                        <Link to={`/beneficiaries/${beneficiary.id}`}
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                          Open profile <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {!isEnrolled && (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                            onClick={() => score.mutate(a)} disabled={score.isPending}>
                            <Calculator className="h-3 w-3 mr-1" /> Score
                          </Button>
                        )}
                        {!isEnrolled && (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                            onClick={() => openMatch(a)}>
                            <HandCoins className="h-3 w-3 mr-1" /> Match & enroll
                          </Button>
                        )}
                        {!isEnrolled && (
                          <Select value={a.status} onValueChange={(v) => transition.mutate({ id: a.id, status: v as WaitlistStatus })}>
                            <SelectTrigger className="h-6 px-2 text-[10px] w-auto"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {WAITLIST_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                              <SelectItem value="declined">Declined</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Match & enroll dialog */}
      <Dialog open={!!matchFor} onOpenChange={(o) => !o && setMatchFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Match & enroll
          </DialogTitle></DialogHeader>
          {matchFor && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border p-3 bg-muted/40">
                <div className="font-medium">{applicantName(matchFor)}</div>
                <div className="text-xs text-muted-foreground">Vulnerability score: {matchFor.vulnerability_score}</div>
                {((matchFor as any).needs || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {((matchFor as any).needs as any[]).map((n) => (
                      <span key={n.id} className={`px-1.5 py-0.5 rounded text-[10px] ${PRIORITY_STYLE[n.priority] || ''}`}>
                        {n.need_type?.label} · {n.priority}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label>Project <span className="text-destructive">*</span></Label>
                <Select value={matchProjectId} onValueChange={setMatchProjectId}>
                  <SelectTrigger><SelectValue placeholder="Choose the project to enroll into" /></SelectTrigger>
                  <SelectContent>
                    {sortedProjects.length === 0 && (
                      <div className="px-2 py-2 text-xs text-muted-foreground">No projects available for this organization.</div>
                    )}
                    {sortedProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {topNeedTypeId && p.addresses_need_type_id === topNeedTypeId ? "  ★ matches top need" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">Applicant will be enrolled into this project as a beneficiary.</p>
              </div>

              <div>
                <Label>Sponsorship package (optional)</Label>
                <Select value={matchPackageId} onValueChange={setMatchPackageId}>
                  <SelectTrigger><SelectValue placeholder="No package — enroll without sponsor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None (needs remain unmet)</SelectItem>
                    {packages.filter((p) => p.active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatMoney(p.monthly_cost, p.currency)}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sponsor / donor name (optional)</Label>
                <Input value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="e.g. Jane Doe" />
              </div>
              {!matchFor.beneficiary_id && (
                <p className="text-xs text-muted-foreground">
                  A new beneficiary record will be created and their needs will be copied from this application.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchFor(null)}>Cancel</Button>
            <Button onClick={() => {
              // Normalise "__none" sentinel to unset
              if (matchPackageId === "__none") setMatchPackageId("");
              submitMatch();
            }} disabled={!matchProjectId || enroll.isPending}>
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}