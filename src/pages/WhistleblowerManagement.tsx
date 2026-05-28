import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { ShieldAlert, EyeOff } from 'lucide-react';

export function WhistleblowerInner() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['whistleblower-reports', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whistleblower_reports')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['org-staff', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name').eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: { id: string; [key: string]: any }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from('whistleblower_reports').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whistleblower-reports'] });
      toast({ title: 'Report updated' });
    },
  });

  const statusColors: Record<string, string> = {
    received: 'bg-blue-100 text-blue-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-green-100 text-green-800',
    referred: 'bg-purple-100 text-purple-800',
  };

  return (
    <>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" /> Whistleblower Reports
        </h1>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Anonymous</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : reports.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No reports</TableCell></TableRow>
                  ) : reports.map((r: any) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                      <TableCell className="font-mono text-xs">{r.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="text-sm capitalize">{r.report_type.replace('_', ' ')}</TableCell>
                      <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><Badge className={statusColors[r.status]}>{r.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>{r.is_anonymous ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : 'Named'}</TableCell>
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
                <SheetTitle>Report {selected.id.slice(0, 8).toUpperCase()}</SheetTitle>
              </SheetHeader>
              <div className="space-y-3">
                <div><Label className="text-xs text-muted-foreground">Type</Label><p className="text-sm capitalize">{selected.report_type.replace('_', ' ')}</p></div>
                <div><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm whitespace-pre-wrap">{selected.description}</p></div>
                {selected.evidence_description && <div><Label className="text-xs text-muted-foreground">Evidence</Label><p className="text-sm whitespace-pre-wrap">{selected.evidence_description}</p></div>}

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selected.status} onValueChange={v => {
                    updateMutation.mutate({ id: selected.id, status: v });
                    setSelected({ ...selected, status: v });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="referred">Referred</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select value={selected.assigned_to || ''} onValueChange={v => {
                    updateMutation.mutate({ id: selected.id, assigned_to: v });
                    setSelected({ ...selected, assigned_to: v });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
                    <SelectContent>
                      {staff.map((s: any) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Response Notes</Label>
                  <Textarea
                    defaultValue={selected.response_notes || ''}
                    onBlur={e => {
                      if (e.target.value !== selected.response_notes) {
                        updateMutation.mutate({ id: selected.id, response_notes: e.target.value });
                      }
                    }}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function WhistleblowerManagement() {
  return (
    <DashboardLayout>
      <div className="p-4">
        <WhistleblowerInner />
      </div>
    </DashboardLayout>
  );
}
