import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  projectId: string;
  orgId?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ProjectSettingsSheet({ projectId, orgId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    target_beneficiaries: "" as string | number,
    project_manager_id: "__none__",
    geographic_focus: "",
    theory_of_change: "",
    donor_visibility: "programme",
  });

  const { data: project } = useQuery({
    queryKey: ["project-settings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["project-org-members", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("user_id, profiles(full_name, email)")
        .eq("organization_id", orgId!);
      return data || [];
    },
    enabled: open && !!orgId,
  });

  useEffect(() => {
    if (project) {
      setForm({
        target_beneficiaries: (project as any).target_beneficiaries ?? "",
        project_manager_id: (project as any).project_manager_id ?? "__none__",
        geographic_focus: ((project as any).geographic_focus || []).join(", "),
        theory_of_change: (project as any).theory_of_change ?? "",
        donor_visibility: (project as any).donor_visibility ?? "programme",
      });
    }
  }, [project]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        target_beneficiaries: form.target_beneficiaries === "" ? null : Number(form.target_beneficiaries),
        project_manager_id: form.project_manager_id === "__none__" ? null : form.project_manager_id,
        geographic_focus: form.geographic_focus
          ? form.geographic_focus.split(",").map(s => s.trim()).filter(Boolean)
          : null,
        theory_of_change: form.theory_of_change || null,
        donor_visibility: form.donor_visibility,
      };
      const { error } = await supabase.from("projects").update(payload).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-detail"] });
      qc.invalidateQueries({ queryKey: ["project-settings", projectId] });
      toast.success("Project settings updated");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Project settings</SheetTitle></SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Target beneficiaries</Label>
            <Input
              type="number"
              min={0}
              value={form.target_beneficiaries}
              onChange={e => setForm(f => ({ ...f, target_beneficiaries: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Project manager</Label>
            <Select value={form.project_manager_id} onValueChange={v => setForm(f => ({ ...f, project_manager_id: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Unassigned —</SelectItem>
                {members.map((m: any) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profiles?.full_name || m.profiles?.email || m.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Geographic focus (comma-separated)</Label>
            <Input
              value={form.geographic_focus}
              onChange={e => setForm(f => ({ ...f, geographic_focus: e.target.value }))}
              placeholder="Nairobi, Kisumu, Mombasa"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Theory of change</Label>
            <Textarea
              rows={4}
              value={form.theory_of_change}
              onChange={e => setForm(f => ({ ...f, theory_of_change: e.target.value }))}
              placeholder="If we do X, then Y will change because…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Donor reporting visibility</Label>
            <Select value={form.donor_visibility} onValueChange={v => setForm(f => ({ ...f, donor_visibility: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="programme">Programme level</SelectItem>
                <SelectItem value="project">Project level</SelectItem>
                <SelectItem value="activity">Activity level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}