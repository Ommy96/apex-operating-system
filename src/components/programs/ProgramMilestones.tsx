import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Flag, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, isPast } from "date-fns";

const TYPE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "report", label: "Report due" },
  { value: "evaluation", label: "Evaluation" },
  { value: "disbursement", label: "Disbursement" },
  { value: "review", label: "Review meeting" },
  { value: "launch", label: "Launch" },
  { value: "close", label: "Project close" },
];

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  completed_date: string | null;
  status: string;
  milestone_type: string;
  project_id: string | null;
};

const statusStyle = (m: Milestone) => {
  if (m.status === "completed") return { dot: "bg-teal-600", text: "text-teal-700", label: "Completed" };
  if (m.status === "cancelled") return { dot: "bg-muted-foreground", text: "text-muted-foreground", label: "Cancelled" };
  if (isPast(new Date(m.due_date)) && m.status !== "completed")
    return { dot: "bg-rose-600", text: "text-rose-700", label: "Overdue" };
  return { dot: "bg-amber-500", text: "text-amber-700", label: "Upcoming" };
};

export function ProgramMilestones({ programId }: { programId?: string }) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "overdue" | "completed">("all");
  const [form, setForm] = useState({ title: "", description: "", due_date: "", milestone_type: "general", project_id: "__program__" });

  const { data: milestones, isLoading } = useQuery({
    queryKey: ["programme-milestones", programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from("programme_milestones")
        .select("*")
        .eq("program_id", programId)
        .is("deleted_at", null)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data || []) as Milestone[];
    },
    enabled: !!programId,
  });

  const { data: projects } = useQuery({
    queryKey: ["program-projects-ms-select", programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data } = await supabase.from("projects").select("id, name").eq("program_id", programId);
      return data || [];
    },
    enabled: !!programId,
  });
  const projectsMap = Object.fromEntries((projects || []).map(p => [p.id, p.name]));

  const filtered = useMemo(() => {
    const list = milestones || [];
    if (filter === "all") return list;
    if (filter === "completed") return list.filter(m => m.status === "completed");
    if (filter === "overdue") return list.filter(m => isPast(new Date(m.due_date)) && m.status !== "completed" && m.status !== "cancelled");
    return list.filter(m => !isPast(new Date(m.due_date)) && m.status !== "completed");
  }, [milestones, filter]);

  const counts = useMemo(() => {
    const list = milestones || [];
    return {
      upcoming: list.filter(m => !isPast(new Date(m.due_date)) && m.status !== "completed").length,
      overdue: list.filter(m => isPast(new Date(m.due_date)) && m.status !== "completed" && m.status !== "cancelled").length,
      completed: list.filter(m => m.status === "completed").length,
    };
  }, [milestones]);

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !programId || !form.title || !form.due_date) throw new Error("Missing fields");
      const { error } = await supabase.from("programme_milestones").insert({
        org_id: orgId,
        program_id: programId,
        project_id: form.project_id === "__program__" ? null : form.project_id,
        title: form.title,
        description: form.description || null,
        due_date: form.due_date,
        milestone_type: form.milestone_type,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme-milestones", programId] });
      toast.success("Milestone added");
      setOpen(false);
      setForm({ title: "", description: "", due_date: "", milestone_type: "general", project_id: "__program__" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programme_milestones").update({
        status: "completed",
        completed_date: new Date().toISOString().slice(0, 10),
        updated_by: user?.id,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme-milestones", programId] });
      toast.success("Marked complete");
    },
  });

  return (
    <div className="space-y-4">
      {counts.overdue > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {counts.overdue} milestone{counts.overdue > 1 ? "s" : ""} overdue
        </div>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="h-4 w-4 text-primary" /> Milestones
              <Badge variant="secondary">{milestones?.length || 0}</Badge>
            </CardTitle>
            <div className="flex gap-1">
              {(["all", "upcoming", "overdue", "completed"] as const).map(f => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "ghost"} className="h-7 capitalize text-xs"
                  onClick={() => setFilter(f)}>{f}</Button>
              ))}
            </div>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add milestone</Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader><SheetTitle>New milestone</SheetTitle></SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5"><Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5"><Label>Description</Label>
                  <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-1.5"><Label>Type</Label>
                  <Select value={form.milestone_type} onValueChange={v => setForm(f => ({ ...f, milestone_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Due date *</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5"><Label>Linked project (optional)</Label>
                  <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__program__">Whole programme</SelectItem>
                      {(projects || []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SheetFooter>
                <Button onClick={() => addMutation.mutate()} disabled={!form.title || !form.due_date || addMutation.isPending}>
                  {addMutation.isPending ? "Saving…" : "Create milestone"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Calendar className="h-8 w-8 text-muted-foreground/40" />
              No milestones in this view
            </div>
          ) : (
            <ol className="relative border-l border-border ml-3 space-y-4">
              {filtered.map((m) => {
                const s = statusStyle(m);
                const due = new Date(m.due_date);
                const daysDiff = differenceInDays(due, new Date());
                return (
                  <li key={m.id} className="ml-6">
                    <span className={`absolute -left-2 mt-1 h-4 w-4 rounded-full ring-4 ring-background ${s.dot}`} />
                    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-elevation-2 transition-shadow">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold">{m.title}</h4>
                            <Badge variant="outline" className="text-xs capitalize">{m.milestone_type.replace("_", " ")}</Badge>
                            <Badge variant="outline" className={`text-xs ${s.text}`}>{s.label}</Badge>
                          </div>
                          {m.description && <p className="text-sm text-muted-foreground mt-1.5">{m.description}</p>}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {format(due, "MMM d, yyyy")}</span>
                            {m.project_id && <span>• {projectsMap[m.project_id] || "Project"}</span>}
                            {m.status !== "completed" && (
                              <span className={daysDiff < 0 ? "text-rose-600 font-medium" : daysDiff <= 14 ? "text-amber-600" : ""}>
                                {daysDiff < 0 ? `${-daysDiff}d overdue` : daysDiff === 0 ? "Today" : `in ${daysDiff}d`}
                              </span>
                            )}
                            {m.status === "completed" && m.completed_date && (
                              <span className="text-teal-600">Completed {format(new Date(m.completed_date), "MMM d, yyyy")}</span>
                            )}
                          </div>
                        </div>
                        {m.status !== "completed" && m.status !== "cancelled" && (
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => completeMutation.mutate(m.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}