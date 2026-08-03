import { useState } from "react";
import { useVolunteers } from "@/hooks/useVolunteers";
import { useOrganization } from "@/hooks/useOrganization";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { Heart, Plus, Users, Clock, Briefcase, CalendarDays, UserCheck, Building2 } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function VolunteerManagement() {
  const {
    volunteers, assignments, hoursLog,
    loadingVolunteers, loadingAssignments, loadingHours,
    createVolunteer, createAssignment, logHours,
    totalHours,
  } = useVolunteers();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const [activeTab, setActiveTab] = useState("staff");
  const [showNewVol, setShowNewVol] = useState(false);
  const [showNewAssign, setShowNewAssign] = useState(false);
  const [showLogHours, setShowLogHours] = useState(false);

  const [volForm, setVolForm] = useState({ full_name: "", email: "", phone: "", skills: "", availability: "", start_date: "", notes: "" });
  const [assignForm, setAssignForm] = useState({ volunteer_id: "", role_title: "", start_date: "", description: "", supervisor_name: "" });
  const [hoursForm, setHoursForm] = useState({ volunteer_id: "", log_date: "", hours: "", description: "" });

  // Fetch staff (organization members)
  const { data: staffMembers = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['org-staff', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, joined_at, branch_id, profiles!inner(full_name, email)')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch active project count for utilisation
  const { data: activeProjectStaff = 0 } = useQuery({
    queryKey: ['staff-utilisation', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'active');
      return count || 0;
    },
    enabled: !!orgId,
  });

  const handleCreateVol = () => {
    if (!volForm.full_name) return;
    createVolunteer.mutate(
      { ...volForm, skills: volForm.skills ? volForm.skills.split(",").map((s) => s.trim()) : [] },
      { onSuccess: () => { setShowNewVol(false); setVolForm({ full_name: "", email: "", phone: "", skills: "", availability: "", start_date: "", notes: "" }); } }
    );
  };

  const handleCreateAssign = () => {
    if (!assignForm.volunteer_id || !assignForm.role_title || !assignForm.start_date) return;
    createAssignment.mutate(assignForm, {
      onSuccess: () => { setShowNewAssign(false); setAssignForm({ volunteer_id: "", role_title: "", start_date: "", description: "", supervisor_name: "" }); },
    });
  };

  const handleLogHours = () => {
    if (!hoursForm.volunteer_id || !hoursForm.log_date || !hoursForm.hours) return;
    logHours.mutate(
      { ...hoursForm, hours: parseFloat(hoursForm.hours) },
      { onSuccess: () => { setShowLogHours(false); setHoursForm({ volunteer_id: "", log_date: "", hours: "", description: "" }); } }
    );
  };

  const activeVols = volunteers.filter((v) => v.status === "active").length;
  const staffUtilisation = staffMembers.length > 0 ? Math.round((activeProjectStaff / staffMembers.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="People"
        description="Manage staff members and volunteers across your organization."
        icon={Users}
      />

      {/* Unified Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Staff", value: staffMembers.length, icon: Building2, color: "primary" },
          { label: "Active Volunteers", value: activeVols, icon: Heart, color: "success" },
          { label: "Volunteer Hours", value: totalHours.toFixed(0), icon: Clock, color: "warning" },
          { label: "Staff Utilisation", value: `${staffUtilisation}%`, icon: Briefcase, color: "info" },
        ].map((s) => (
          <Card key={s.label} className="workspace-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl bg-${s.color}/10 flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 text-${s.color}`} />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-semibold text-foreground truncate">{s.value}</p>
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto">
            <TabsTrigger value="staff"><Building2 className="h-4 w-4 mr-1.5" />Staff</TabsTrigger>
            <TabsTrigger value="volunteers"><Users className="h-4 w-4 mr-1.5" />Volunteers</TabsTrigger>
            <TabsTrigger value="assignments"><Briefcase className="h-4 w-4 mr-1.5" />Assignments</TabsTrigger>
            <TabsTrigger value="hours"><Clock className="h-4 w-4 mr-1.5" />Hours Log</TabsTrigger>
          </TabsList>
        </div>

        {/* Staff Tab */}
        <TabsContent value="staff" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-foreground">Staff Members</h3>
          </div>
          <Card className="workspace-card">
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingStaff ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : staffMembers.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No staff members found.</TableCell></TableRow>
                  ) : (
                    staffMembers.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.profiles?.full_name || '—'}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize text-xs">{m.role}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-[13px]">{m.profiles?.email || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-[13px]">{m.joined_at ? format(new Date(m.joined_at), "MMM d, yyyy") : '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Volunteers Tab */}
        <TabsContent value="volunteers" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Volunteers</h3>
            <Dialog open={showNewVol} onOpenChange={setShowNewVol}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Volunteer</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Volunteer</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Full Name *</Label><Input value={volForm.full_name} onChange={(e) => setVolForm((p) => ({ ...p, full_name: e.target.value }))} /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Email</Label><Input type="email" value={volForm.email} onChange={(e) => setVolForm((p) => ({ ...p, email: e.target.value }))} /></div>
                    <div><Label>Phone</Label><Input value={volForm.phone} onChange={(e) => setVolForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                  </div>
                  <div><Label>Skills (comma-separated)</Label><Input value={volForm.skills} onChange={(e) => setVolForm((p) => ({ ...p, skills: e.target.value }))} placeholder="Teaching, Counseling, Data Entry" /></div>
                  <div><Label>Availability</Label><Input value={volForm.availability} onChange={(e) => setVolForm((p) => ({ ...p, availability: e.target.value }))} placeholder="Weekends, Mon-Fri mornings" /></div>
                  <div><Label>Start Date</Label><Input type="date" value={volForm.start_date} onChange={(e) => setVolForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
                  <div><Label>Notes</Label><Textarea value={volForm.notes} onChange={(e) => setVolForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
                  <Button onClick={handleCreateVol} disabled={createVolunteer.isPending} className="w-full">{createVolunteer.isPending ? "Adding..." : "Add Volunteer"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loadingVolunteers ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="workspace-card"><CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-muted animate-pulse" /><div className="flex-1 space-y-1.5"><div className="h-4 w-32 bg-muted animate-pulse rounded" /><div className="h-3 w-24 bg-muted animate-pulse rounded" /></div></div>
                    <div className="flex gap-1"><div className="h-5 w-16 bg-muted animate-pulse rounded" /><div className="h-5 w-14 bg-muted animate-pulse rounded" /></div>
                  </CardContent></Card>
                ))}
              </>
            ) : volunteers.length === 0 ? (
              <Card className="workspace-card col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No volunteers yet.</CardContent></Card>
            ) : (
              volunteers.map((v) => (
                <Card key={v.id} className="workspace-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {v.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{v.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{v.email || "No email"}</p>
                      </div>
                      <Badge variant={v.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{v.status}</Badge>
                    </div>
                    {v.skills && (v.skills as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(v.skills as string[]).slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                        ))}
                        {(v.skills as string[]).length > 3 && <Badge variant="outline" className="text-xs">+{(v.skills as string[]).length - 3}</Badge>}
                      </div>
                    )}
                    {v.availability && <p className="text-xs text-muted-foreground mt-2">📅 {v.availability}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Assignments</h3>
            <Dialog open={showNewAssign} onOpenChange={setShowNewAssign}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Assignment</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Volunteer *</Label>
                    <Select value={assignForm.volunteer_id} onValueChange={(v) => setAssignForm((p) => ({ ...p, volunteer_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select volunteer" /></SelectTrigger>
                      <SelectContent>
                        {volunteers.filter((v) => v.status === "active").map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Role / Title *</Label><Input value={assignForm.role_title} onChange={(e) => setAssignForm((p) => ({ ...p, role_title: e.target.value }))} placeholder="Field Assistant" /></div>
                  <div><Label>Start Date *</Label><Input type="date" value={assignForm.start_date} onChange={(e) => setAssignForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
                  <div><Label>Supervisor</Label><Input value={assignForm.supervisor_name} onChange={(e) => setAssignForm((p) => ({ ...p, supervisor_name: e.target.value }))} /></div>
                  <div><Label>Description</Label><Textarea value={assignForm.description} onChange={(e) => setAssignForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
                  <Button onClick={handleCreateAssign} disabled={createAssignment.isPending} className="w-full">{createAssignment.isPending ? "Creating..." : "Create Assignment"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="workspace-card">
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Start Date</TableHead>
                    <TableHead className="hidden md:table-cell">Supervisor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAssignments ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : assignments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No assignments yet.</TableCell></TableRow>
                  ) : (
                    assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{(a.volunteers as any)?.full_name || "—"}</TableCell>
                        <TableCell>{a.role_title}</TableCell>
                        <TableCell className="hidden sm:table-cell">{format(new Date(a.start_date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="hidden md:table-cell">{a.supervisor_name || "—"}</TableCell>
                        <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"} className="capitalize">{a.status}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hours Tab */}
        <TabsContent value="hours" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Hours Log</h3>
            <Dialog open={showLogHours} onOpenChange={setShowLogHours}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Log Hours</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log Volunteer Hours</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Volunteer *</Label>
                    <Select value={hoursForm.volunteer_id} onValueChange={(v) => setHoursForm((p) => ({ ...p, volunteer_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select volunteer" /></SelectTrigger>
                      <SelectContent>
                        {volunteers.filter((v) => v.status === "active").map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Date *</Label><Input type="date" value={hoursForm.log_date} onChange={(e) => setHoursForm((p) => ({ ...p, log_date: e.target.value }))} /></div>
                    <div><Label>Hours *</Label><Input type="number" step="0.5" min="0.5" value={hoursForm.hours} onChange={(e) => setHoursForm((p) => ({ ...p, hours: e.target.value }))} /></div>
                  </div>
                  <div><Label>Description</Label><Textarea value={hoursForm.description} onChange={(e) => setHoursForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
                  <Button onClick={handleLogHours} disabled={logHours.isPending} className="w-full">{logHours.isPending ? "Logging..." : "Log Hours"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="workspace-card">
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHours ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : hoursLog.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No hours logged yet.</TableCell></TableRow>
                  ) : (
                    hoursLog.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{(h.volunteers as any)?.full_name || "—"}</TableCell>
                        <TableCell>{format(new Date(h.log_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>{Number(h.hours).toFixed(1)}h</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground max-w-[200px] truncate">{h.description || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
