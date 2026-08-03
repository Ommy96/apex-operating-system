import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Sprout, Target, Users, Banknote, ShieldCheck, Building2, Megaphone, MoreHorizontal, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  programId?: string;
  projectId?: string;
  orgId?: string;
}

const CATEGORIES = [
  { value: "handover", label: "Handover", icon: Building2 },
  { value: "capacity_building", label: "Capacity Building", icon: Users },
  { value: "financial", label: "Financial", icon: Banknote },
  { value: "governance", label: "Governance", icon: ShieldCheck },
  { value: "ownership", label: "Ownership", icon: Target },
  { value: "advocacy", label: "Advocacy", icon: Megaphone },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "blocked", label: "Blocked" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  not_started: "status-badge-muted",
  in_progress: "status-badge-warning",
  completed: "status-badge-success",
  blocked: "status-badge-danger",
  cancelled: "status-badge-muted line-through",
};

const emptyMilestone = {
  title: "", description: "", category: "handover", responsible_party: "",
  due_date: "", completion_date: "", status: "not_started",
  progress_percent: 0, notes: "",
};

const emptyPlan = {
  vision: "", exit_strategy_summary: "", target_handover_date: "",
  post_exit_owner: "", ownership_model: "",
  financial_sustainability_notes: "", capacity_transfer_notes: "",
  risks_to_continuity: "",
};

export function SustainabilityPlan({ programId, projectId, orgId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyMilestone);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["sustainability-plan", programId, projectId],
    queryFn: async () => {
      let q = supabase.from("program_sustainability_plans" as any).select("*").is("deleted_at", null);
      if (projectId) q = q.eq("project_id", projectId);
      else if (programId) q = q.eq("program_id", programId).is("project_id", null);
      const { data, error } = await q.maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      const p: any = data;
      if (p && !planLoaded) {
        setPlanForm({
          vision: p.vision || "",
          exit_strategy_summary: p.exit_strategy_summary || "",
          target_handover_date: p.target_handover_date || "",
          post_exit_owner: p.post_exit_owner || "",
          ownership_model: p.ownership_model || "",
          financial_sustainability_notes: p.financial_sustainability_notes || "",
          capacity_transfer_notes: p.capacity_transfer_notes || "",
          risks_to_continuity: p.risks_to_continuity || "",
        });
        setPlanLoaded(true);
      }
      return p;
    },
    enabled: !!orgId && (!!programId || !!projectId),
  });

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ["sustainability-milestones", programId, projectId],
    queryFn: async () => {
      let q = supabase.from("program_sustainability_milestones" as any).select("*").is("deleted_at", null);
      if (projectId) q = q.eq("project_id", projectId);
      else if (programId) q = q.eq("program_id", programId);
      const { data, error } = await q.order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!orgId && (!!programId || !!projectId),
  });

  const savePlan = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const payload: any = {
        organization_id: orgId,
        program_id: projectId ? null : programId,
        project_id: projectId || null,
        ...planForm,
        target_handover_date: planForm.target_handover_date || null,
        updated_by: user?.id,
      };
      if (plan?.id) {
        const { error } = await supabase.from("program_sustainability_plans" as any)
          .update(payload).eq("id", plan.id);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from("program_sustainability_plans" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Sustainability plan saved");
      qc.invalidateQueries({ queryKey: ["sustainability-plan", programId, projectId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save plan"),
  });

  const saveMilestone = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const payload: any = {
        organization_id: orgId,
        program_id: projectId ? null : programId,
        project_id: projectId || null,
        title: form.title,
        description: form.description || null,
        category: form.category,
        responsible_party: form.responsible_party || null,
        due_date: form.due_date || null,
        completion_date: form.completion_date || null,
        status: form.status,
        progress_percent: Number(form.progress_percent) || 0,
        notes: form.notes || null,
        updated_by: user?.id,
      };
      if (editingId) {
        const { error } = await supabase.from("program_sustainability_milestones" as any)
          .update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from("program_sustainability_milestones" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Milestone updated" : "Milestone added");
      qc.invalidateQueries({ queryKey: ["sustainability-milestones", programId, projectId] });
      setOpenSheet(false);
      setEditingId(null);
      setForm(emptyMilestone);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_sustainability_milestones" as any)
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Milestone removed");
      qc.invalidateQueries({ queryKey: ["sustainability-milestones", programId, projectId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete"),
  });

  const filtered = milestones.filter((m: any) =>
    (statusFilter === "all" || m.status === statusFilter) &&
    (categoryFilter === "all" || m.category === categoryFilter)
  );

  const total = milestones.length;
  const completed = milestones.filter((m: any) => m.status === "completed").length;
  const inProgress = milestones.filter((m: any) => m.status === "in_progress").length;
  const avgProgress = total ? Math.round(milestones.reduce((s: number, m: any) => s + (m.progress_percent || 0), 0) / total) : 0;

  const openEdit = (m: any) => {
    setEditingId(m.id);
    setForm({
      title: m.title || "",
      description: m.description || "",
      category: m.category || "handover",
      responsible_party: m.responsible_party || "",
      due_date: m.due_date || "",
      completion_date: m.completion_date || "",
      status: m.status || "not_started",
      progress_percent: m.progress_percent || 0,
      notes: m.notes || "",
    });
    setOpenSheet(true);
  };

  return (
    <div className="space-y-6">
      {/* Plan Narrative */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            <CardTitle>Sustainability & Exit Strategy</CardTitle>
          </div>
          <Button size="sm" onClick={() => savePlan.mutate()} disabled={savePlan.isPending}>
            <Save className="h-4 w-4 mr-2" />Save Plan
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {planLoading ? <Skeleton className="h-40 w-full" /> : (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Long-Term Vision</Label>
                  <Textarea rows={3} value={planForm.vision}
                    onChange={e => setPlanForm({ ...planForm, vision: e.target.value })}
                    placeholder="What lasting change should remain after exit?" />
                </div>
                <div>
                  <Label>Exit Strategy Summary</Label>
                  <Textarea rows={3} value={planForm.exit_strategy_summary}
                    onChange={e => setPlanForm({ ...planForm, exit_strategy_summary: e.target.value })}
                    placeholder="High-level transition approach..." />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Target Handover Date</Label>
                  <Input type="date" value={planForm.target_handover_date}
                    onChange={e => setPlanForm({ ...planForm, target_handover_date: e.target.value })} />
                </div>
                <div>
                  <Label>Post-Exit Owner</Label>
                  <Input value={planForm.post_exit_owner}
                    onChange={e => setPlanForm({ ...planForm, post_exit_owner: e.target.value })}
                    placeholder="Community group, government, partner..." />
                </div>
                <div>
                  <Label>Ownership Model</Label>
                  <Input value={planForm.ownership_model}
                    onChange={e => setPlanForm({ ...planForm, ownership_model: e.target.value })}
                    placeholder="e.g. CBO, cooperative, public" />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Financial Sustainability</Label>
                  <Textarea rows={3} value={planForm.financial_sustainability_notes}
                    onChange={e => setPlanForm({ ...planForm, financial_sustainability_notes: e.target.value })}
                    placeholder="Revenue streams, endowments, cost-recovery..." />
                </div>
                <div>
                  <Label>Capacity Transfer</Label>
                  <Textarea rows={3} value={planForm.capacity_transfer_notes}
                    onChange={e => setPlanForm({ ...planForm, capacity_transfer_notes: e.target.value })}
                    placeholder="Training, mentoring, skills handover..." />
                </div>
                <div>
                  <Label>Risks to Continuity</Label>
                  <Textarea rows={3} value={planForm.risks_to_continuity}
                    onChange={e => setPlanForm({ ...planForm, risks_to_continuity: e.target.value })}
                    placeholder="Key risks that could undermine sustainability..." />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Milestones</div>
          <div className="text-2xl font-semibold">{total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Completed</div>
          <div className="text-2xl font-semibold" style={{ color: "var(--status-success)" }}>{completed}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">In Progress</div>
          <div className="text-2xl font-semibold" style={{ color: "var(--status-warning)" }}>{inProgress}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Avg Progress</div>
          <div className="text-2xl font-semibold">{avgProgress}%</div>
          <Progress value={avgProgress} className="h-1 mt-2" />
        </CardContent></Card>
      </div>

      {/* Milestones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base">Transition Milestones</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Sheet open={openSheet} onOpenChange={(v) => { setOpenSheet(v); if (!v) { setEditingId(null); setForm(emptyMilestone); } }}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Milestone</Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>{editingId ? "Edit Milestone" : "New Milestone"}</SheetTitle>
                </SheetHeader>
                <div className="space-y-3 mt-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea rows={3} value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Responsible Party</Label>
                    <Input value={form.responsible_party}
                      onChange={e => setForm({ ...form, responsible_party: e.target.value })}
                      placeholder="Person, team, or organisation" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Due Date</Label>
                      <Input type="date" value={form.due_date}
                        onChange={e => setForm({ ...form, due_date: e.target.value })} />
                    </div>
                    <div>
                      <Label>Completion Date</Label>
                      <Input type="date" value={form.completion_date}
                        onChange={e => setForm({ ...form, completion_date: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Progress (%)</Label>
                    <Input type="number" min={0} max={100} value={form.progress_percent}
                      onChange={e => setForm({ ...form, progress_percent: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea rows={2} value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <Button onClick={() => saveMilestone.mutate()} disabled={!form.title || saveMilestone.isPending} className="w-full">
                    {editingId ? "Update" : "Create"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sprout className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No transition milestones yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((m: any) => {
                const cat = CATEGORIES.find(c => c.value === m.category) || CATEGORIES[CATEGORIES.length - 1];
                const Icon = cat.icon;
                return (
                  <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{m.title}</span>
                        <Badge variant="secondary" className={STATUS_COLORS[m.status]}>{m.status.replace("_", " ")}</Badge>
                        <Badge variant="outline" className="text-xs">{cat.label}</Badge>
                      </div>
                      {m.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        {m.responsible_party && <span>👤 {m.responsible_party}</span>}
                        {m.due_date && <span>📅 Due {format(new Date(m.due_date), "MMM d, yyyy")}</span>}
                        {m.completion_date && <span>✅ {format(new Date(m.completion_date), "MMM d, yyyy")}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={m.progress_percent || 0} className="h-1.5 flex-1" />
                        <span className="text-xs font-mono w-10 text-right">{m.progress_percent || 0}%</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this milestone?")) deleteMilestone.mutate(m.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}