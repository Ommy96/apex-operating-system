import { useState } from "react";
import { useVolunteers } from "@/hooks/useVolunteers";
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
import { Heart, Plus, Users, Clock, Briefcase, CalendarDays } from "lucide-react";
import { format } from "date-fns";

export default function VolunteerManagement() {
  const {
    volunteers, assignments, hoursLog,
    loadingVolunteers, loadingAssignments, loadingHours,
    createVolunteer, createAssignment, logHours,
    totalHours,
  } = useVolunteers();

  const [activeTab, setActiveTab] = useState("volunteers");
  const [showNewVol, setShowNewVol] = useState(false);
  const [showNewAssign, setShowNewAssign] = useState(false);
  const [showLogHours, setShowLogHours] = useState(false);

  const [volForm, setVolForm] = useState({ full_name: "", email: "", phone: "", skills: "", availability: "", start_date: "", notes: "" });
  const [assignForm, setAssignForm] = useState({ volunteer_id: "", role_title: "", start_date: "", description: "", supervisor_name: "" });
  const [hoursForm, setHoursForm] = useState({ volunteer_id: "", log_date: "", hours: "", description: "" });

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

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="Volunteer Management"
        description="Track volunteers, manage assignments, and log service hours across programs."
        icon={Heart}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Volunteers", value: volunteers.length, icon: Users, color: "primary" },
          { label: "Active", value: activeVols, icon: Heart, color: "success" },
          { label: "Assignments", value: assignments.length, icon: Briefcase, color: "info" },
          { label: "Total Hours", value: totalHours.toFixed(0), icon: Clock, color: "warning" },
        ].map((s) => (
          <Card key={s.label} className="workspace-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl bg-${s.color}/10 flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 text-${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="volunteers"><Users className="h-4 w-4 mr-1.5" />Volunteers</TabsTrigger>
          <TabsTrigger value="assignments"><Briefcase className="h-4 w-4 mr-1.5" />Assignments</TabsTrigger>
          <TabsTrigger value="hours"><Clock className="h-4 w-4 mr-1.5" />Hours Log</TabsTrigger>
        </TabsList>

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
                  <div className="grid grid-cols-2 gap-3">
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
              <p className="col-span-full text-center py-8 text-muted-foreground">Loading...</p>
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
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Supervisor</TableHead>
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
                        <TableCell>{format(new Date(a.start_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>{a.supervisor_name || "—"}</TableCell>
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
                  <div className="grid grid-cols-2 gap-3">
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
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Description</TableHead>
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
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{h.description || "—"}</TableCell>
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
