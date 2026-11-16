import { useState, useEffect } from "react";
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
import { usePermissions } from "@/hooks/usePermissions";
import { useOrgStaff } from "@/hooks/useOrgStaff";
import { canAssignTeam, PROGRAMME_TEAM_ROLE, WHOLE_PROGRAMME, teamValueMatches } from "@/lib/teamAssignment";

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

const roleMeta = (r: string) => ROLE_OPTIONS.find(o => teamValueMatches(o.value, r)) || ROLE_OPTIONS[7];

export function ProgramTeam({ programId }: { programId?: string }) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { can, hasPermission } = usePermissions();
  const canManageTeam = canAssignTeam(can, hasPermission);
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [role, setRole] = useState<string>(PROGRAMME_TEAM_ROLE.FIELD_OFFICER);
  const [projectId, setProjectId] = useState<string>(WHOLE_PROGRAMME);
  const [startDate, setStartDate] = useState("");

  const { data: members, isLoading, error: teamError, refetch: retryTeam } = useQuery({
    queryKey: ["programme-team", programId, orgId],
    queryFn: async () => {
      if (!programId || !orgId) return [];
      const { data, error } = await supabase
        .from("programme_team")
        .select("*")
        .eq("program_id", programId)
        .eq("org_id", orgId)
        .is("end_date", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId && !!orgId,
    retry: false,
  });

  const staffIds = Array.from(new Set((members || []).map(m => m.staff_id)));
  const { data: profilesMap, isLoading: profilesLoading, error: profileError, refetch: retryProfiles } = useQuery({
    queryKey: ["team-profiles", orgId, staffIds.join(",")],
    queryFn: async () => {
      if (staffIds.length === 0) return {} as Record<string, { full_name: string; email: string }>;
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", staffIds);
      if (error) throw error;
      const map: Record<string, { full_name: string; email: string }> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = { full_name: p.full_name || p.email, email: p.email }; });
      return map;
    },
    enabled: staffIds.length > 0,
    retry: false,
  });

  const { data: orgStaff, isLoading: staffLoading, error: staffError, refetch: retryStaff } = useOrgStaff(orgId);

  const { data: projects, error: projectError, refetch: retryProjects } = useQuery({
    queryKey: ["program-projects-team-select", orgId, programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase.from("projects").select("id, name").eq("program_id", programId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
    retry: false,
  });

  const readError = teamError || profileError || staffError || projectError;
  useEffect(() => { if (readError) toast.error(readError.message); }, [readError]);

  const projectsMap = Object.fromEntries((projects || []).map(p => [p.id, p.name]));

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !programId || !staffId) throw new Error("Missing fields");
      const { data, error } = await supabase.from("programme_team").insert({
        org_id: orgId,
        program_id: programId,
        project_id: teamValueMatches(projectId, WHOLE_PROGRAMME) ? null : projectId,
        staff_id: staffId,
        role,
        start_date: startDate || null,
        created_by: user?.id,
      }).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Team member was not saved. Check your access and retry.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme-team", programId] });
      toast.success("Team member added");
      setOpen(false); setStaffId(""); setProjectId(WHOLE_PROGRAMME); setStartDate("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("programme_team").update({ end_date: format(new Date(), "yyyy-MM-dd"), updated_at: new Date().toISOString(), updated_by: user?.id }).eq("id", id).eq("org_id", orgId).eq("program_id", programId).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Assignment was not ended. Check your access and retry.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme-team", programId] });
      toast.success("Team member removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" /> Programme Team
          <Badge variant="secondary">{members?.length || 0}</Badge>
        </CardTitle>
        {canManageTeam && <Sheet open={open} onOpenChange={setOpen}>
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
                      <SelectItem key={s.user_id} value={s.user_id}>{s.label}</SelectItem>
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
                    <SelectItem value={WHOLE_PROGRAMME}>Whole programme</SelectItem>
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
        </Sheet>}
      </CardHeader>
      <CardContent>
        {readError ? (
          <div role="alert" className="space-y-3 py-6"><p className="text-sm text-destructive">Could not load the programme team: {readError.message}</p><Button variant="outline" onClick={() => { void retryTeam(); void retryProfiles(); void retryStaff(); void retryProjects(); }}>Retry</Button></div>
        ) : isLoading || staffLoading || profilesLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (members || []).length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No staff assigned yet
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
                const staff = orgStaff?.find(s => s.user_id === m.staff_id);
                const profile = profilesMap?.[m.staff_id] || (staff ? { full_name: staff.label, email: staff.email } : undefined);
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
                      {canManageTeam && <Button variant="ghost" size="icon" aria-label="End assignment" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>}
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