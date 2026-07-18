import { useMemo, useState } from "react";
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
import { Users, Plus, Calculator, HandCoins, GraduationCap } from "lucide-react";
import {
  useWaitlist, useUpsertWaitlist, useScoreWaitlist, useTransitionWaitlist, useMatchAndEnroll,
  WAITLIST_STAGES, type WaitlistApplication, type WaitlistStatus,
} from "@/hooks/useWaitlist";
import { useSponsorshipPackages } from "@/hooks/useSponsorshipPackages";
import { formatMoney } from "@/lib/allocationEngine";

function applicantName(a: WaitlistApplication) {
  const b = (a as any).beneficiaries;
  return b?.display_name || [b?.first_name, b?.last_name].filter(Boolean).join(" ") || a.applicant_name || "Unnamed applicant";
}

export default function WaitlistManagement() {
  const { data: apps = [], isLoading } = useWaitlist();
  const { data: packages = [] } = useSponsorshipPackages();
  const upsert = useUpsertWaitlist();
  const score = useScoreWaitlist();
  const transition = useTransitionWaitlist();
  const enroll = useMatchAndEnroll();

  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({
    applicant_name: "", applicant_age: "", applicant_location: "",
    applicant_notes: "", guardian_contact: "",
  });
  const [matchFor, setMatchFor] = useState<WaitlistApplication | null>(null);
  const [matchPackageId, setMatchPackageId] = useState<string>("");
  const [donorName, setDonorName] = useState("");

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

  const submitNew = async () => {
    if (!form.applicant_name.trim()) return;
    await upsert.mutateAsync({
      applicant_name: form.applicant_name,
      applicant_age: form.applicant_age ? Number(form.applicant_age) : null,
      applicant_location: form.applicant_location || null,
      applicant_notes: form.applicant_notes || null,
      guardian_contact: form.guardian_contact || null,
      status: "application",
      vulnerability_score: 0,
    });
    setNewOpen(false);
    setForm({ applicant_name: "", applicant_age: "", applicant_location: "", applicant_notes: "", guardian_contact: "" });
  };

  const submitMatch = async () => {
    if (!matchFor || !matchPackageId) return;
    const pkg = packages.find((p) => p.id === matchPackageId);
    if (!pkg) return;
    await enroll.mutateAsync({
      application: matchFor,
      packageId: pkg.id,
      packageCost: pkg.monthly_cost,
      donorName: donorName || undefined,
    });
    setMatchFor(null);
    setMatchPackageId("");
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
            Applicants ranked by vulnerability. Reuses the eligibility engine when linked to a beneficiary + project.
          </p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New application</Button>
          </DialogTrigger>
          <DialogContent>
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
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
                ) : grouped[stage.key].map((a) => (
                  <div key={a.id} className="rounded-md border bg-background p-2 text-xs space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{applicantName(a)}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">Score {a.vulnerability_score}</Badge>
                    </div>
                    {a.applicant_age != null && (
                      <div className="text-muted-foreground">Age {a.applicant_age}{a.applicant_location ? ` · ${a.applicant_location}` : ""}</div>
                    )}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                        onClick={() => score.mutate(a)} disabled={score.isPending}>
                        <Calculator className="h-3 w-3 mr-1" /> Score
                      </Button>
                      {a.status !== "enrolled" && (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                          onClick={() => { setMatchFor(a); }}>
                          <HandCoins className="h-3 w-3 mr-1" /> Match
                        </Button>
                      )}
                      {a.status !== "enrolled" && (
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
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Match & enroll dialog */}
      <Dialog open={!!matchFor} onOpenChange={(o) => !o && setMatchFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Match & enroll
          </DialogTitle></DialogHeader>
          {matchFor && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border p-3 bg-muted/40">
                <div className="font-medium">{applicantName(matchFor)}</div>
                <div className="text-xs text-muted-foreground">Vulnerability score: {matchFor.vulnerability_score}</div>
              </div>
              <div>
                <Label>Sponsorship package</Label>
                <Select value={matchPackageId} onValueChange={setMatchPackageId}>
                  <SelectTrigger><SelectValue placeholder="Select a package" /></SelectTrigger>
                  <SelectContent>
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
                <p className="text-xs text-warning">
                  This applicant isn't linked to an existing beneficiary. Enrollment will move the application to Enrolled;
                  create the beneficiary record separately to route funds through the Allocation Engine.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchFor(null)}>Cancel</Button>
            <Button onClick={submitMatch} disabled={!matchPackageId || enroll.isPending}>
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}