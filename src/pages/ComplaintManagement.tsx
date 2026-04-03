import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Filter } from 'lucide-react';

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-700',
};

export default function ComplaintManagement() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [filters, setFilters] = useState({ status: 'all', category: 'all', priority: 'all' });

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('organization_id', orgId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['org-staff', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: { id: string; [key: string]: any }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from('complaints').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      toast({ title: 'Complaint updated' });
    },
  });

  const filtered = complaints.filter((c: any) => {
    if (filters.status !== 'all' && c.status !== filters.status) return false;
    if (filters.category !== 'all' && c.category !== filters.category) return false;
    if (filters.priority !== 'all' && c.priority !== filters.priority) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" /> Complaints & Feedback
          </h1>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={filters.status} onValueChange={v => setFilters(p => ({ ...p, status: v }))}>
            <SelectTrigger className="w-36"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority} onValueChange={v => setFilters(p => ({ ...p, priority: v }))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No complaints found</TableCell></TableRow>
                  ) : filtered.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(c)}>
                      <TableCell className="font-mono text-xs">{c.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="text-sm">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm capitalize">{c.category.replace('_', ' ')}</TableCell>
                      <TableCell><Badge className={priorityColors[c.priority]}>{c.priority}</Badge></TableCell>
                      <TableCell><Badge className={statusColors[c.status]}>{c.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-sm">{staff.find((s: any) => s.user_id === c.assigned_to)?.full_name || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selected && (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>Complaint {selected.id.slice(0, 8).toUpperCase()}</SheetTitle>
              </SheetHeader>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Submitted</Label>
                  <p className="text-sm">{new Date(selected.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Submitted By</Label>
                  <p className="text-sm">{selected.is_anonymous ? 'Anonymous' : (selected.submitted_by_name || 'Not provided')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <p className="text-sm capitalize">{selected.category.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={selected.status}
                    onValueChange={v => {
                      const updates: any = { id: selected.id, status: v };
                      if (v === 'resolved') updates.resolved_at = new Date().toISOString();
                      updateMutation.mutate(updates);
                      setSelected({ ...selected, status: v });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={selected.assigned_to || ''}
                    onValueChange={v => {
                      updateMutation.mutate({ id: selected.id, assigned_to: v });
                      setSelected({ ...selected, assigned_to: v });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Assign staff" /></SelectTrigger>
                    <SelectContent>
                      {staff.map((s: any) => (
                        <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Resolution Notes</Label>
                  <Textarea
                    defaultValue={selected.resolution_notes || ''}
                    onBlur={e => {
                      if (e.target.value !== selected.resolution_notes) {
                        updateMutation.mutate({ id: selected.id, resolution_notes: e.target.value });
                      }
                    }}
                    placeholder="Add resolution notes..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
