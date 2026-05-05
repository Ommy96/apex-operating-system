import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  programId?: string | null;
  orgId?: string;
}

export function NewActivitySheet({ open, onOpenChange, projectId, programId, orgId }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    planned_start_date: "",
    planned_end_date: "",
    status: "planned",
    milestone_id: "none",
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones-for-activity", projectId, programId],
    queryFn: async () => {
      let q = supabase.from("programme_milestones").select("id, title").is("deleted_at", null);
      if (projectId) q = q.eq("project_id", projectId);
      const { data } = await q;
      return data || [];
    },
    enabled: open && !!projectId,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("activities").insert({
        title: form.title,
        name: form.title,
        description: form.description || null,
        project_id: projectId,
        program_id: programId || null,
        organization_id: orgId!,
        planned_start_date: form.planned_start_date || null,
        planned_end_date: form.planned_end_date || null,
        status: form.status,
        milestone_id: form.milestone_id !== "none" ? form.milestone_id : null,
        completion_percentage: 0,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-gantt-activities"] });
      toast.success("Activity added");
      onOpenChange(false);
      setForm({ title: "", description: "", planned_start_date: "", planned_end_date: "", status: "planned", milestone_id: "none" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader><SheetTitle>New Activity</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="date" value={form.planned_start_date} onChange={e => setForm(p => ({ ...p, planned_start_date: e.target.value }))} /></div>
            <div><Label>End</Label><Input type="date" value={form.planned_end_date} onChange={e => setForm(p => ({ ...p, planned_end_date: e.target.value }))} /></div>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Linked Milestone</Label>
            <Select value={form.milestone_id} onValueChange={v => setForm(p => ({ ...p, milestone_id: v }))}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {milestones.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>Create Activity</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}