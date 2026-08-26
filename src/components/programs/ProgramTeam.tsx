import { useState } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Users, Crown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ROLE_OPTIONS = [
  { value: "programme_manager", label: "Programme Manager", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "project_manager", label: "Project Manager", color: "status-badge-info" },
  { value: "me_officer", label: "M&E Officer", color: "bg-accent/10 text-accent border-accent/20" },
  { value: "field_officer", label: "Field Officer", color: "status-badge-success" },
  { value: "finance_officer", label: "Finance Officer", color: "status-badge-warning" },
  { value: "data_entry", label: "Data Entry", color: "status-badge-muted" },
  { value: "advisor", label: "Advisor", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "other", label: "Other", color: "bg-muted text-muted-foreground" },
];

const roleMeta = (r: string) => ROLE_OPTIONS.find(o => o.value === r) || ROLE_OPTIONS[7];

export function ProgramTeam({ programId }: { programId?: string }) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [role, setRole] = useState("field_officer");
  const [projectId, setProjectId] = useState<string>("__program__");
  const [startDate, setStartDate] = useState("");

  const { data: members, isLoading } = useQuery({
    queryKey: ["programme-team", programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from("programme_team")
        .select("*")
        .eq("program_id", programId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  const staffIds = Array.from(new Set((members || []).map(m => m.staff_id)));
  const { data: profilesMap } = useQuery({
    queryKey: ["team-profiles", staffIds.join(",")],
    queryFn: async () => {
      if (staffIds.length === 0) return {} as Record<string, { full_name: string; email: string }>;
      const { data } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", staffIds);
      const map: Record<string, { full_name: string; email: string }> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = { full_name: p.full_name || p.email, email: p.email }; });
      return map;
    },
    enabled: staffIds.length > 0,
  });

  const { data: orgStaff } = useQuery({
    queryKey: ["org-staff-list", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data: members, error: membersError } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", orgId);
      if (membersError) throw membersError;
      const ids = (members || []).map((m: any) => m.user_id).filter(Boolean);
      if (ids.length === 0) return [];
      const { data: profs, error: profsError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      if (profsError) throw profsError;
      const byUser = new Map((profs || []).map((p: any) => [p.user_id, p]));
      return ids.map((id: string) => {
        const p: any = byUser.get(id);
        return { user_id: id, name: p?.full_name || p?.email || "Unnamed member", email: p?.email };
      });
    },
    enabled: !!orgId && open,
  });

  const { data: projects } = useQuery({
    queryKey: ["program-projects-team-select", programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data } = await supabase.from("projects").select("id, name").eq("program_id", programId);
      return data || [];
    },
    enabled: !!programId && open,
  });

  const projectsMap = Object.fromEntries((projects || []).map(p => [p.id, p.name]));

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !programId || !staffId) throw new Error("Missing fields");
      const { error } = await supabase.from("programme_team").insert({
        org_id: orgId,
        program_id: programId,
        project_id: projectId === "__program__" ? null : projectId,
        staff_id: staffId,
        role,
        start_date: startDate || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme-team", programId] });
      toast.success("Team member added");
      setOpen(false); setStaffId(""); setProjectId("__program__"); setStartDate("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programme_team").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme-team", programId] });
      toast.success("Team member removed");
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" /> Programme Team
          <Badge variant="secondary">{members?.length || 0}</Badge>
        </CardTitle>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add member</Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader><SheetTitle>Add team member</SheetTitle></SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label>Staff member</Label>
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {(orgStaff || []).map(s => (
                      <SelectItem key={s.user_id} value={s.user_id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assign to</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__program__">Whole programme</SelectItem>
                    {(projects || []).map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
            </div>
            <SheetFooter>
              <Button onClick={() => addMutation.mutate()} disabled={!staffId || addMutation.isPending}>
                {addMutation.isPending ? "Saving…" : "Add member"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (members || []).length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No team members yet. Add a programme manager and field staff to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Assignment</TableHead>
                <TableHead className="hidden md:table-cell">Start</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members || []).map((m: any) => {
                const meta = roleMeta(m.role);
                const profile = profilesMap?.[m.staff_id];
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {(profile?.full_name || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1">
                            {profile?.full_name || "Unknown"}
                            {m.is_lead && <Crown className="h-3 w-3 text-[var(--status-warning)]" />}
                          </div>
                          <div className="text-xs text-muted-foreground">{profile?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={meta.color} variant="outline">{meta.label}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {m.project_id ? projectsMap[m.project_id] || "Project" : "Whole programme"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {m.start_date ? format(new Date(m.start_date), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeMutation.mutate(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}