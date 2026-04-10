import { useState } from 'react';
import { useVolunteers } from '@/hooks/useVolunteers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

export function VolunteerHoursLog() {
  const { volunteers, hoursLog, loadingHours, logHours } = useVolunteers();
  const [showLogHours, setShowLogHours] = useState(false);
  const [hoursForm, setHoursForm] = useState({ volunteer_id: '', log_date: '', hours: '', description: '' });

  const handleLogHours = () => {
    if (!hoursForm.volunteer_id || !hoursForm.log_date || !hoursForm.hours) return;
    logHours.mutate(
      { ...hoursForm, hours: parseFloat(hoursForm.hours) },
      { onSuccess: () => { setShowLogHours(false); setHoursForm({ volunteer_id: '', log_date: '', hours: '', description: '' }); } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-foreground">Volunteer Hours</h3>
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
                    {volunteers.filter((v) => v.status === 'active').map((v) => (
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
              <Button onClick={handleLogHours} disabled={logHours.isPending} className="w-full">{logHours.isPending ? 'Logging...' : 'Log Hours'}</Button>
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
                    <TableCell className="font-medium">{(h.volunteers as any)?.full_name || '—'}</TableCell>
                    <TableCell>{format(new Date(h.log_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{Number(h.hours).toFixed(1)}h</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground max-w-[200px] truncate">{h.description || '—'}</TableCell>
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
