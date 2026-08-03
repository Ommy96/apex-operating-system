import { useState } from 'react';
import { useVolunteers } from '@/hooks/useVolunteers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

export function VolunteerDirectory() {
  const { volunteers, loadingVolunteers, createVolunteer, deleteVolunteer } = useVolunteers();
  const { can } = usePermissions();
  const canDelete = !!(can as any).manageStaff || !!(can as any).manageHR;
  const [showNewVol, setShowNewVol] = useState(false);
  const [volForm, setVolForm] = useState({ full_name: '', email: '', phone: '', skills: '', availability: '', start_date: '', notes: '' });

  const handleCreateVol = () => {
    if (!volForm.full_name) return;
    createVolunteer.mutate(
      { ...volForm, skills: volForm.skills ? volForm.skills.split(',').map((s) => s.trim()) : [] },
      { onSuccess: () => { setShowNewVol(false); setVolForm({ full_name: '', email: '', phone: '', skills: '', availability: '', start_date: '', notes: '' }); } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-foreground">Volunteers</h3>
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
              <Button onClick={handleCreateVol} disabled={createVolunteer.isPending} className="w-full">{createVolunteer.isPending ? 'Adding...' : 'Add Volunteer'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loadingVolunteers ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="workspace-card"><CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-muted animate-pulse" /><div className="flex-1 space-y-1.5"><div className="h-4 w-32 bg-muted animate-pulse rounded" /><div className="h-3 w-24 bg-muted animate-pulse rounded" /></div></div>
            </CardContent></Card>
          ))
        ) : volunteers.length === 0 ? (
          <Card className="workspace-card col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No volunteers yet. Add your first volunteer using the button above.</CardContent></Card>
        ) : (
          volunteers.map((v) => (
            <Card key={v.id} className="workspace-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {v.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{v.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{v.email || 'No email'}</p>
                  </div>
                  <Badge variant={v.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">{v.status}</Badge>
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${v.full_name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {v.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This cannot be undone after 10 seconds. Their activity history will be retained but their profile will be removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteVolunteer.mutate(v.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
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
    </div>
  );
}
