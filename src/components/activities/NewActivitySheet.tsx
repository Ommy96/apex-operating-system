import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId?: string;
  /** When provided, the project picker is locked to this project. */
  projectId?: string;
  /** Navigate to the new activity after creation (default true). */
  navigateAfter?: boolean;
  onCreated?: (id: string) => void;
}

export function NewActivitySheet({ open, onOpenChange, orgId, projectId, navigateAfter = true, onCreated }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "",
    project_id: projectId || "",
    type: "event" as "event" | "disbursement",
    status: "planned" as "planned" | "in_progress" | "completed" | "cancelled",
    scheduled_at: "",
    location: "",
    facilitator_name: "",
  });

  useEffect(() => {
    if (open) {
      setForm((p) => ({ ...p, project_id: projectId || p.project_id }));
    }
  }, [open, projectId]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-activity", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, program_id")
        .eq("organization_id", orgId!)
        .is("deleted_at", null)
        .order("name");
      return data || [];
    },
    enabled: open && !!orgId,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      if (!form.project_id) throw new Error("Project is required");
      const proj = projects.find((p: any) => p.id === form.project_id);
      const payload: any = {
        organization_id: orgId!,
        project_id: form.project_id,
        program_id: proj?.program_id || null,
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        location: form.location || null,
        facilitator_name: form.facilitator_name || null,
        created_by: user?.id || null,
      };
      const { data, error } = await (supabase as any).from("activities").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["project-activities"] });
      qc.invalidateQueries({ queryKey: ["program-activities"] });
      toast.success("Activity created");
      onOpenChange(false);
      setForm({ name: "", project_id: projectId || "", type: "event", status: "planned", scheduled_at: "", location: "", facilitator_name: "" });
      onCreated?.(id);
      if (navigateAfter) navigate(`/activities/${id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New activity</SheetTitle>
          <SheetDescription>A scheduled event or a disbursement to beneficiaries.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Q3 community training" />
          </div>

          <div>
            <Label>Project *</Label>
            <Select value={form.project_id} onValueChange={(v) => setForm((p) => ({ ...p, project_id: v }))} disabled={!!projectId}>
              <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v: any) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="disbursement">Disbursement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Scheduled date</Label>
            <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))} />
          </div>

          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Venue or area" />
          </div>

          <div>
            <Label>Facilitator</Label>
            <Input value={form.facilitator_name} onChange={(e) => setForm((p) => ({ ...p, facilitator_name: e.target.value }))} placeholder="Person responsible" />
          </div>

          <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create activity"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}