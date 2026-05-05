import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarClock, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { format, isBefore, isAfter, addDays } from "date-fns";
import { toast } from "sonner";

interface Props {
  programId: string;
  orgId?: string;
}

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannual", label: "Bi-annual" },
  { value: "annual", label: "Annual" },
];

const METHODS = [
  { value: "survey", label: "Survey" },
  { value: "interview", label: "Interview" },
  { value: "observation", label: "Observation" },
  { value: "records_review", label: "Records review" },
  { value: "focus_group", label: "Focus group" },
];

export function ProgramMESchedule({ programId, orgId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    indicator_id: "",
    collection_frequency: "monthly",
    collection_method: "survey",
    next_due_date: "",
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["me-schedule", programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("me_data_schedule")
        .select("*, indicator:indicators(id, name, code, unit)")
        .eq("program_id", programId)
        .eq("is_active", true)
        .order("next_due_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  const { data: indicators = [] } = useQuery({
    queryKey: ["indicators-for-schedule", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("indicators")
        .select("id, name, code")
        .eq("organization_id", orgId!)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!orgId && open,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.indicator_id || !form.next_due_date) throw new Error("Indicator & date required");
      const { error } = await supabase.from("me_data_schedule").insert({
        program_id: programId,
        org_id: orgId!,
        indicator_id: form.indicator_id,
        collection_frequency: form.collection_frequency,
        frequency: form.collection_frequency,
        collection_method: form.collection_method,
        next_due_date: form.next_due_date,
        next_collection_date: form.next_due_date,
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me-schedule", programId] });
      toast.success("Schedule added");
      setOpen(false);
      setForm({ indicator_id: "", collection_frequency: "monthly", collection_method: "survey", next_due_date: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markCollected = useMutation({
    mutationFn: async (s: any) => {
      const today = new Date();
      const nextMap: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90, biannual: 182, annual: 365 };
      const days = nextMap[s.collection_frequency] || 30;
      const next = addDays(today, days).toISOString().split("T")[0];
      const { error } = await supabase.from("me_data_schedule").update({
        last_collected_date: today.toISOString().split("T")[0],
        last_collected_at: today.toISOString(),
        next_due_date: next,
        next_collection_date: next,
      }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me-schedule", programId] });
      toast.success("Marked collected");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("me_data_schedule").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me-schedule", programId] }),
  });

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  const today = new Date();

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">M&E Data Collection Schedule</h3>
            <p className="text-xs text-muted-foreground">Plan when each indicator is measured</p>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Schedule</Button></SheetTrigger>
            <SheetContent>
              <SheetHeader><SheetTitle>New M&E Schedule</SheetTitle></SheetHeader>
              <div className="space-y-4 mt-4">
                <div><Label>Indicator *</Label>
                  <Select value={form.indicator_id} onValueChange={v => setForm(p => ({ ...p, indicator_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select indicator" /></SelectTrigger>
                    <SelectContent>{indicators.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.code} – {i.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Frequency</Label>
                  <Select value={form.collection_frequency} onValueChange={v => setForm(p => ({ ...p, collection_frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Collection Method</Label>
                  <Select value={form.collection_method} onValueChange={v => setForm(p => ({ ...p, collection_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Next Due Date *</Label><Input type="date" value={form.next_due_date} onChange={e => setForm(p => ({ ...p, next_due_date: e.target.value }))} /></div>
                <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>Add Schedule</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No data collection scheduled yet.</div>
        ) : (
          <div className="space-y-2">
            {schedules.map((s: any) => {
              const due = new Date(s.next_due_date);
              const overdue = isBefore(due, today);
              const upcoming = !overdue && isBefore(due, addDays(today, 7));
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/20">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${overdue ? "bg-destructive/10 text-destructive" : upcoming ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}`}>
                    {overdue ? <AlertTriangle className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.indicator?.name || "Unknown indicator"}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] capitalize">{s.collection_frequency}</Badge>
                      {s.collection_method && <Badge variant="outline" className="text-[10px] capitalize">{s.collection_method.replace("_", " ")}</Badge>}
                      <span className={`text-[10px] ${overdue ? "text-destructive" : upcoming ? "text-warning" : "text-muted-foreground"}`}>
                        Due {format(due, "MMM d, yyyy")}
                      </span>
                      {s.last_collected_date && (
                        <span className="text-[10px] text-muted-foreground">Last: {format(new Date(s.last_collected_date), "MMM d")}</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => markCollected.mutate(s)} className="text-xs h-7">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Collected
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Remove from schedule?")) remove.mutate(s.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}