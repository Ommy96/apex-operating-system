import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitMerge, Users } from "lucide-react";
import { toast } from "sonner";
import { isActiveStatus } from "@/lib/statusHelpers";

interface Props {
  programId: string;
  organizationId: string;
}

export function ProgramOnlyEnrollments({ programId, organizationId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetProject, setTargetProject] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["program-only-enrollments", programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiary_services")
        .select("id, status, beneficiary_id, beneficiary:beneficiaries(id, display_name, first_name, last_name)")
        .eq("program_id", programId)
        .eq("organization_id", organizationId)
        .is("project_id", null);
      if (error) throw error;
      return (data || []).filter((r: any) => isActiveStatus(r.status));
    },
    enabled: !!programId && !!organizationId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["program-projects-for-assign", programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("program_id", programId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  if (isLoading || rows.length === 0) return null;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r: any) => r.id)));
  };

  const assign = async () => {
    if (!targetProject || selected.size === 0) return;
    setSaving(true);
    const { error } = await supabase
      .from("beneficiary_services")
      .update({ project_id: targetProject })
      .in("id", Array.from(selected));
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Assigned ${selected.size} beneficiary(ies) to project`);
    setOpen(false);
    setSelected(new Set());
    setTargetProject("");
    qc.invalidateQueries({ queryKey: ["program-only-enrollments", programId] });
    qc.invalidateQueries({ queryKey: ["program-beneficiaries-count", programId] });
    qc.invalidateQueries({ queryKey: ["project-beneficiary-count"] });
    qc.invalidateQueries({ queryKey: ["project-beneficiary-counts-batch"] });
    qc.invalidateQueries({ queryKey: ["program-projects"] });
  };

  return (
    <Card className="border-warning/40 bg-warning/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-warning" />
            </div>
            {rows.length} beneficiary{rows.length === 1 ? "" : "ies"} enrolled at programme level
            <Badge variant="outline" className="ml-1">Not yet assigned to a project</Badge>
          </CardTitle>
          <Button size="sm" onClick={() => setOpen(true)} disabled={projects.length === 0}>
            <GitMerge className="h-4 w-4 mr-1.5" /> Assign to project
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          These beneficiaries are counted at programme level but need to be placed into a specific project so
          project dashboards, funding coverage, and reports reflect them accurately.
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign programme-only beneficiaries to a project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Target project</label>
              <Select value={targetProject} onValueChange={setTargetProject}>
                <SelectTrigger><SelectValue placeholder="Choose a project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-md max-h-[320px] overflow-auto">
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40 sticky top-0">
                <Checkbox checked={selected.size === rows.length && rows.length > 0} onCheckedChange={toggleAll} />
                <span className="text-xs font-medium">
                  {selected.size} of {rows.length} selected
                </span>
              </div>
              {rows.map((r: any) => {
                const name = r.beneficiary?.display_name ||
                  `${r.beneficiary?.first_name ?? ""} ${r.beneficiary?.last_name ?? ""}`.trim() ||
                  "Unknown";
                return (
                  <label key={r.id} className="flex items-center gap-2 px-3 py-2 border-b hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                    <span className="text-sm">{name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={assign} disabled={!targetProject || selected.size === 0 || saving}>
              {saving ? "Assigning…" : `Assign ${selected.size || ""}`.trim()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}