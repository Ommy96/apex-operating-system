import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Props {
  activity: any | null;
  onClose: () => void;
}

export function ActivityDetailSheet({ activity, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (activity) {
      setForm({
        title: activity.title || activity.name || "",
        description: activity.description || "",
        planned_start_date: activity.planned_start_date || "",
        planned_end_date: activity.planned_end_date || "",
        actual_start_date: activity.actual_start_date || "",
        actual_end_date: activity.actual_end_date || "",
        status: activity.status || "planned",
        completion_percentage: activity.completion_percentage ?? 0,
      });
    }
  }, [activity]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").update({
        title: form.title,
        name: form.title,
        description: form.description || null,
        planned_start_date: form.planned_start_date || null,
        planned_end_date: form.planned_end_date || null,
        actual_start_date: form.actual_start_date || null,
        actual_end_date: form.actual_end_date || null,
        status: form.status,
        completion_percentage: form.completion_percentage,
      }).eq("id", activity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-gantt-activities"] });
      toast.success("Activity updated");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").delete().eq("id", activity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-gantt-activities"] });
      toast.success("Activity deleted");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!activity) return null;

  return (
    <Sheet open={!!activity} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader><SheetTitle>Edit Activity</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div><Label>Title</Label><Input value={form.title || ""} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} /></div>
          <div><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Planned Start</Label><Input type="date" value={form.planned_start_date || ""} onChange={e => setForm((p: any) => ({ ...p, planned_start_date: e.target.value }))} /></div>
            <div><Label>Planned End</Label><Input type="date" value={form.planned_end_date || ""} onChange={e => setForm((p: any) => ({ ...p, planned_end_date: e.target.value }))} /></div>
            <div><Label>Actual Start</Label><Input type="date" value={form.actual_start_date || ""} onChange={e => setForm((p: any) => ({ ...p, actual_start_date: e.target.value }))} /></div>
            <div><Label>Actual End</Label><Input type="date" value={form.actual_end_date || ""} onChange={e => setForm((p: any) => ({ ...p, actual_end_date: e.target.value }))} /></div>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm((p: any) => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Completion: {form.completion_percentage}%</Label>
            <Slider value={[form.completion_percentage || 0]} onValueChange={v => setForm((p: any) => ({ ...p, completion_percentage: v[0] }))} max={100} step={5} className="mt-2" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
            <Button variant="destructive" size="icon" onClick={() => { if (confirm("Delete activity?")) del.mutate(); }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}