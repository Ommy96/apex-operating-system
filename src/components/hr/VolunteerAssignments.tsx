import { useState } from 'react';
import { useVolunteers } from '@/hooks/useVolunteers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

export function VolunteerAssignments() {
  const { volunteers, assignments, loadingAssignments, createAssignment } = useVolunteers();
  const [showNewAssign, setShowNewAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ volunteer_id: '', role_title: '', start_date: '', description: '', supervisor_name: '' });

  const handleCreateAssign = () => {
    if (!assignForm.volunteer_id || !assignForm.role_title || !assignForm.start_date) return;
    createAssignment.mutate(assignForm, {
      onSuccess: () => { setShowNewAssign(false); setAssignForm({ volunteer_id: '', role_title: '', start_date: '', description: '', supervisor_name: '' }); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-foreground">Volunteer Assignments</h3>
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
                    {volunteers.filter((v) => v.status === 'active').map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Role / Title *</Label><Input value={assignForm.role_title} onChange={(e) => setAssignForm((p) => ({ ...p, role_title: e.target.value }))} placeholder="Field Assistant" /></div>
              <div><Label>Start Date *</Label><Input type="date" value={assignForm.start_date} onChange={(e) => setAssignForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>Supervisor</Label><Input value={assignForm.supervisor_name} onChange={(e) => setAssignForm((p) => ({ ...p, supervisor_name: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea value={assignForm.description} onChange={(e) => setAssignForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
              <Button onClick={handleCreateAssign} disabled={createAssignment.isPending} className="w-full">{createAssignment.isPending ? 'Creating...' : 'Create Assignment'}</Button>
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
                    <TableCell className="font-medium">{(a.volunteers as any)?.full_name || '—'}</TableCell>
                    <TableCell>{a.role_title}</TableCell>
                    <TableCell className="hidden sm:table-cell">{format(new Date(a.start_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="hidden md:table-cell">{a.supervisor_name || '—'}</TableCell>
                    <TableCell><Badge variant={a.status === 'active' ? 'default' : 'secondary'} className="capitalize">{a.status}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
