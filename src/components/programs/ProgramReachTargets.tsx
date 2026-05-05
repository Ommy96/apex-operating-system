import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Target as TargetIcon, Plus, Trash2, Pencil, Users } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Gender", "Age Group", "Disability Status", "Location Type", "Location", "Other"];

interface Props {
  programId: string;
  orgId?: string;
  projectId?: string;
}

const blank = {
  category: "Gender",
  segment: "",
  location: "",
  target_count: 0,
  period_start: "",
  period_end: "",
  notes: "",
};

export function ProgramReachTargets({ programId, orgId, projectId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(blank);

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ["program-reach-targets", programId, projectId],
    queryFn: async () => {
      let q = supabase.from("program_reach_targets" as any)
        .select("*").eq("program_id", programId).is("deleted_at", null)
        .order("category").order("segment");
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!programId,
  });

  // Actual reach from beneficiary_services within the program/project
  const { data: actuals = {} } = useQuery({
    queryKey: ["program-reach-actuals", programId, projectId],
    queryFn: async () => {
      let q = supabase.from("beneficiary_services").select("beneficiary_id, beneficiaries:beneficiary_id(gender, date_of_birth, county, country, has_disability)").eq("program_id", programId);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      const seen = new Set<string>();
      const buckets: Record<string, Set<string>> = {};
      const add = (cat: string, seg: string, bid: string) => {
        const key = `${cat}::${seg.toLowerCase()}`;
        if (!buckets[key]) buckets[key] = new Set();
        buckets[key].add(bid);
      };
      (data || []).forEach((row: any) => {
        const b = row.beneficiaries; const bid = row.beneficiary_id;
        if (!b || !bid || seen.has(bid)) return;
        seen.add(bid);
        if (b.gender) add("Gender", b.gender, bid);
        if (b.county) add("Location", b.county, bid);
        if (b.country) add("Location", b.country, bid);
        if (b.has_disability != null) add("Disability Status", b.has_disability ? "With disability" : "Without disability", bid);
        if (b.date_of_birth) {
          const age = Math.floor((Date.now() - new Date(b.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          const bucket = age <= 5 ? "0-5" : age <= 17 ? "6-17" : age <= 35 ? "18-35" : age <= 60 ? "36-60" : "60+";
          add("Age Group", bucket, bid);
        }
      });
      const out: Record<string, number> = {};
      Object.entries(buckets).forEach(([k, v]) => { out[k] = v.size; });
      return out;
    },
    enabled: !!programId,
  });

  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      const { id, ...rest } = payload;
      const { data: { user } } = await supabase.auth.getUser();
      const body: any = {
        ...rest,
        organization_id: orgId,
        program_id: programId,
        project_id: projectId || null,
        target_count: Number(rest.target_count) || 0,
        period_start: rest.period_start || null,
        period_end: rest.period_end || null,
        updated_by: user?.id,
      };
      if (id) {
        const { error } = await supabase.from("program_reach_targets" as any).update(body).eq("id", id);
        if (error) throw error;
      } else {
        body.created_by = user?.id;
        const { error } = await supabase.from("program_reach_targets" as any).insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["program-reach-targets", programId] });
      setOpen(false); setEditing(null); setForm(blank);
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("program_reach_targets" as any)
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["program-reach-targets", programId] }); toast.success("Removed"); },
  });

  const summary = useMemo(() => {
    let totalTarget = 0, totalActual = 0;
    targets.forEach((t: any) => {
      totalTarget += t.target_count || 0;
      totalActual += actuals[`${t.category}::${(t.segment || "").toLowerCase()}`] || 0;
    });
    return { totalTarget, totalActual, pct: totalTarget ? Math.round((totalActual / totalTarget) * 100) : 0 };
  }, [targets, actuals]);

  const startEdit = (row: any) => {
    setEditing(row);
    setForm({
      category: row.category, segment: row.segment, location: row.location || "",
      target_count: row.target_count, period_start: row.period_start || "",
      period_end: row.period_end || "", notes: row.notes || "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Planned reach</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{summary.totalTarget.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Actual reach</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{summary.totalActual.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Coverage</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{summary.pct}%</div><Progress value={Math.min(summary.pct, 100)} className="mt-2" /></CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><TargetIcon className="h-4 w-4" /> Disaggregated targets vs actual reach</div>
        <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(blank); } }}>
          <SheetTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add target</Button></SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader><SheetTitle>{editing ? "Edit target" : "New reach target"}</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Segment</Label><Input value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} placeholder="e.g. Female, 6-17, Nairobi" /></div>
              <div><Label>Location (optional)</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Target count</Label><Input type="number" value={form.target_count} onChange={(e) => setForm({ ...form, target_count: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Period start</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
                <div><Label>Period end</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" disabled={!form.segment || !orgId} onClick={() => upsert.mutate({ id: editing?.id, ...form })}>{editing ? "Update" : "Create"}</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? <Skeleton className="h-40 w-full" /> : targets.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
          No targets yet. Add demographic or location targets to track planned vs actual reach.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {targets.map((t: any) => {
            const actual = actuals[`${t.category}::${(t.segment || "").toLowerCase()}`] || 0;
            const pct = t.target_count ? Math.round((actual / t.target_count) * 100) : 0;
            return (
              <Card key={t.id}>
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{t.category}</Badge>
                      <span className="font-medium">{t.segment}</span>
                      {t.location && <span className="text-xs text-muted-foreground">· {t.location}</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress value={Math.min(pct, 100)} className="flex-1 h-2" />
                      <span className="text-xs tabular-nums whitespace-nowrap">{actual.toLocaleString()} / {Number(t.target_count).toLocaleString()} ({pct}%)</span>
                    </div>
                    {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}