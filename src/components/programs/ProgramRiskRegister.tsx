import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Plus, ShieldAlert, Trash2, Pencil, CheckCircle2, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CATEGORIES = [
  { value: "operational", label: "Operational" },
  { value: "financial", label: "Financial" },
  { value: "strategic", label: "Strategic" },
  { value: "compliance", label: "Compliance" },
  { value: "external", label: "External" },
  { value: "safeguarding", label: "Safeguarding" },
];

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "mitigating", label: "Mitigating" },
  { value: "monitoring", label: "Monitoring" },
  { value: "closed", label: "Closed" },
  { value: "realized", label: "Realized" },
];

const VALIDITY = [
  { value: "holding", label: "Holding" },
  { value: "at_risk", label: "At Risk" },
  { value: "broken", label: "Broken" },
];

function scoreColor(score: number) {
  if (score >= 16) return "bg-destructive/10 text-destructive border-destructive/30";
  if (score >= 9) return "bg-warning/10 text-warning border-warning/30";
  if (score >= 4) return "bg-primary/10 text-primary border-primary/30";
  return "bg-success/10 text-success border-success/30";
}

function scoreLabel(score: number) {
  if (score >= 16) return "Critical";
  if (score >= 9) return "High";
  if (score >= 4) return "Medium";
  return "Low";
}

interface Props {
  programId: string;
  orgId?: string;
  projectId?: string;
}

const blankRisk = {
  title: "",
  description: "",
  category: "operational",
  likelihood: 3,
  impact: 3,
  status: "open",
  mitigation_plan: "",
  contingency_plan: "",
  due_date: "",
};

export const ProgramRiskRegister = ({ programId, orgId, projectId }: Props) => {
  const qc = useQueryClient();
  const [riskOpen, setRiskOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<any>(null);
  const [form, setForm] = useState<any>(blankRisk);

  const [assumptionOpen, setAssumptionOpen] = useState(false);
  const [editingAssumption, setEditingAssumption] = useState<any>(null);
  const [aForm, setAForm] = useState<any>({ assumption: "", validity: "holding", notes: "", linked_risk_id: "" });

  const riskFilterCol = projectId ? "project_id" : "program_id";
  const riskFilterVal = projectId || programId;

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ["program-risks", riskFilterCol, riskFilterVal],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_risks" as any)
        .select("*")
        .eq(riskFilterCol, riskFilterVal)
        .is("deleted_at", null)
        .order("risk_score", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!riskFilterVal,
  });

  const { data: assumptions = [] } = useQuery({
    queryKey: ["logframe-assumptions", programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logframe_assumptions" as any)
        .select("*")
        .eq("program_id", programId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!programId && !projectId,
  });

  const upsertRisk = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Missing organization");
      const payload: any = {
        org_id: orgId,
        program_id: projectId ? null : programId,
        project_id: projectId || null,
        title: form.title,
        description: form.description || null,
        category: form.category,
        likelihood: Number(form.likelihood),
        impact: Number(form.impact),
        status: form.status,
        mitigation_plan: form.mitigation_plan || null,
        contingency_plan: form.contingency_plan || null,
        due_date: form.due_date || null,
      };
      const user = (await supabase.auth.getUser()).data.user;
      if (editingRisk) {
        payload.updated_by = user?.id;
        const { error } = await supabase.from("program_risks" as any).update(payload).eq("id", editingRisk.id);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from("program_risks" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["program-risks"] });
      toast.success(editingRisk ? "Risk updated" : "Risk added");
      setRiskOpen(false);
      setEditingRisk(null);
      setForm(blankRisk);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRisk = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_risks" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["program-risks"] });
      toast.success("Risk removed");
    },
  });

  const upsertAssumption = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Missing organization");
      const payload: any = {
        org_id: orgId,
        program_id: programId,
        assumption: aForm.assumption,
        validity: aForm.validity,
        notes: aForm.notes || null,
        linked_risk_id: aForm.linked_risk_id || null,
      };
      const user = (await supabase.auth.getUser()).data.user;
      if (editingAssumption) {
        payload.updated_by = user?.id;
        const { error } = await supabase.from("logframe_assumptions" as any).update(payload).eq("id", editingAssumption.id);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from("logframe_assumptions" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logframe-assumptions"] });
      toast.success(editingAssumption ? "Assumption updated" : "Assumption added");
      setAssumptionOpen(false);
      setEditingAssumption(null);
      setAForm({ assumption: "", validity: "holding", notes: "", linked_risk_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAssumption = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("logframe_assumptions" as any).update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logframe-assumptions"] });
      toast.success("Assumption removed");
    },
  });

  const openEditRisk = (r: any) => {
    setEditingRisk(r);
    setForm({
      title: r.title || "",
      description: r.description || "",
      category: r.category || "operational",
      likelihood: r.likelihood,
      impact: r.impact,
      status: r.status,
      mitigation_plan: r.mitigation_plan || "",
      contingency_plan: r.contingency_plan || "",
      due_date: r.due_date || "",
    });
    setRiskOpen(true);
  };

  const openEditAssumption = (a: any) => {
    setEditingAssumption(a);
    setAForm({
      assumption: a.assumption || "",
      validity: a.validity || "holding",
      notes: a.notes || "",
      linked_risk_id: a.linked_risk_id || "",
    });
    setAssumptionOpen(true);
  };

  // Heatmap matrix counts
  const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  risks.forEach((r) => {
    if (r.likelihood && r.impact) matrix[5 - r.likelihood][r.impact - 1] += 1;
  });

  return (
    <div className="space-y-6">
      {/* Heatmap + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold">Risk Heatmap</h3>
              </div>
              <span className="text-xs text-muted-foreground">Likelihood × Impact</span>
            </div>
            <div className="flex gap-2">
              <div className="flex flex-col justify-between text-[10px] text-muted-foreground py-1">
                {[5, 4, 3, 2, 1].map((n) => <span key={n} className="h-10 flex items-center">{n}</span>)}
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-5 gap-1">
                  {matrix.flatMap((row, ri) =>
                    row.map((count, ci) => {
                      const likelihood = 5 - ri;
                      const impact = ci + 1;
                      const score = likelihood * impact;
                      return (
                        <div
                          key={`${ri}-${ci}`}
                          className={`h-10 rounded-md flex items-center justify-center text-xs font-semibold border ${scoreColor(score)}`}
                          title={`L${likelihood} × I${impact} = ${score}`}
                        >
                          {count > 0 ? count : ""}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1 mt-1 text-[10px] text-muted-foreground text-center">
                  {[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1">Impact →</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Summary
            </h3>
            {(["Critical", "High", "Medium", "Low"] as const).map((label) => {
              const count = risks.filter((r) => scoreLabel(r.risk_score) === label).length;
              return (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <Badge variant="outline" className={scoreColor(label === "Critical" ? 20 : label === "High" ? 12 : label === "Medium" ? 6 : 2)}>
                    {count}
                  </Badge>
                </div>
              );
            })}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-sm">
              <span className="font-medium">Total</span>
              <span className="font-semibold">{risks.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk register */}
      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-warning" /> Risk Register</h3>
              <p className="text-xs text-muted-foreground">Track and mitigate risks affecting delivery</p>
            </div>
            <Sheet open={riskOpen} onOpenChange={(v) => { setRiskOpen(v); if (!v) { setEditingRisk(null); setForm(blankRisk); } }}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Risk</Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto sm:max-w-lg">
                <SheetHeader><SheetTitle>{editingRisk ? "Edit Risk" : "New Risk"}</SheetTitle></SheetHeader>
                <div className="space-y-3 mt-4">
                  <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Likelihood (1-5)</Label>
                      <Select value={String(form.likelihood)} onValueChange={(v) => setForm({ ...form, likelihood: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Impact (1-5)</Label>
                      <Select value={String(form.impact)} onValueChange={(v) => setForm({ ...form, impact: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Mitigation Plan</Label><Textarea rows={2} value={form.mitigation_plan} onChange={(e) => setForm({ ...form, mitigation_plan: e.target.value })} /></div>
                  <div><Label>Contingency Plan</Label><Textarea rows={2} value={form.contingency_plan} onChange={(e) => setForm({ ...form, contingency_plan: e.target.value })} /></div>
                  <div><Label>Review Due</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                  <Button onClick={() => upsertRisk.mutate()} disabled={!form.title || upsertRisk.isPending} className="w-full">
                    {editingRisk ? "Save Changes" : "Add Risk"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : risks.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No risks tracked yet. Add the first one to begin.
            </div>
          ) : (
            <div className="space-y-2">
              {risks.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors">
                  <div className={`shrink-0 h-12 w-12 rounded-lg border flex flex-col items-center justify-center ${scoreColor(r.risk_score)}`}>
                    <span className="text-sm font-bold leading-none">{r.risk_score}</span>
                    <span className="text-[9px] uppercase mt-0.5">{scoreLabel(r.risk_score)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{r.title}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{r.category}</Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{r.status}</Badge>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>L{r.likelihood} · I{r.impact}</span>
                      {r.due_date && <span>Review: {format(new Date(r.due_date), "MMM d, yyyy")}</span>}
                      {r.mitigation_plan && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Mitigation</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRisk(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteRisk.mutate(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assumptions (program level only) */}
      {!projectId && (
        <Card className="border-border/60">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> Assumptions</h3>
                <p className="text-xs text-muted-foreground">Conditions that must hold for the logframe to deliver outcomes</p>
              </div>
              <Sheet open={assumptionOpen} onOpenChange={(v) => { setAssumptionOpen(v); if (!v) { setEditingAssumption(null); setAForm({ assumption: "", validity: "holding", notes: "", linked_risk_id: "" }); } }}>
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add Assumption</Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                  <SheetHeader><SheetTitle>{editingAssumption ? "Edit Assumption" : "New Assumption"}</SheetTitle></SheetHeader>
                  <div className="space-y-3 mt-4">
                    <div><Label>Assumption *</Label><Textarea rows={3} value={aForm.assumption} onChange={(e) => setAForm({ ...aForm, assumption: e.target.value })} /></div>
                    <div>
                      <Label>Validity</Label>
                      <Select value={aForm.validity} onValueChange={(v) => setAForm({ ...aForm, validity: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{VALIDITY.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Linked Risk (optional)</Label>
                      <Select value={aForm.linked_risk_id || "none"} onValueChange={(v) => setAForm({ ...aForm, linked_risk_id: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {risks.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Notes</Label><Textarea rows={2} value={aForm.notes} onChange={(e) => setAForm({ ...aForm, notes: e.target.value })} /></div>
                    <Button onClick={() => upsertAssumption.mutate()} disabled={!aForm.assumption || upsertAssumption.isPending} className="w-full">
                      {editingAssumption ? "Save Changes" : "Add Assumption"}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {assumptions.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No assumptions logged yet.</div>
            ) : (
              <div className="space-y-2">
                {assumptions.map((a) => {
                  const v = a.validity === "broken" ? "bg-destructive/10 text-destructive border-destructive/30"
                    : a.validity === "at_risk" ? "bg-warning/10 text-warning border-warning/30"
                    : "bg-success/10 text-success border-success/30";
                  const linked = risks.find((r) => r.id === a.linked_risk_id);
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{a.assumption}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] capitalize ${v}`}>
                            {a.validity.replace("_", " ")}
                          </Badge>
                          {linked && <Badge variant="secondary" className="text-[10px]">Risk: {linked.title}</Badge>}
                          {a.notes && <span className="text-[11px] text-muted-foreground">{a.notes}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAssumption(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteAssumption.mutate(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProgramRiskRegister;