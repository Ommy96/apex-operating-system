import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ShieldAlert, AlertTriangle, Plus, Upload } from 'lucide-react';
import { WhistleblowerInner } from './WhistleblowerManagement';

const INCIDENT_TYPES = [
  { value: 'child_abuse', label: 'Child Abuse' },
  { value: 'sexual_exploitation', label: 'Sexual Exploitation' },
  { value: 'GBV', label: 'Gender-Based Violence' },
  { value: 'neglect', label: 'Neglect' },
  { value: 'physical_harm', label: 'Physical Harm' },
  { value: 'psychological_harm', label: 'Psychological Harm' },
  { value: 'other', label: 'Other' },
];

const severityColors: Record<string, string> = {
  low: 'bg-muted text-foreground',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-warning/10 text-warning',
  critical: 'bg-destructive/10 text-destructive',
};

const statusColors: Record<string, string> = {
  reported: 'bg-info/10 text-info',
  under_investigation: 'bg-warning/10 text-warning',
  closed: 'bg-success/10 text-success',
  referred_externally: 'bg-info/10 text-info',
};

export default function SafeguardingDashboard() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const activeTab = tabParam === 'whistleblower' ? 'whistleblower' : 'incidents';
  const onTabChange = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'incidents') next.delete('tab');
    else next.set('tab', v);
    setParams(next, { replace: true });
  };
  const [selected, setSelected] = useState<any>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({
    incident_date: '', incident_type: '', severity: 'medium',
    description: '', location: '', persons_involved: '', immediate_action_taken: '',
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['safeguarding-incidents', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safeguarding_incidents')
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
      const { data } = await supabase.from('profiles').select('user_id, full_name').eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from('safeguarding_incidents').insert({
        organization_id: orgId,
        reporter_id: user?.id,
        ...form,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['safeguarding-incidents'] });
      toast({ title: 'Incident reported' });
      setShowReportForm(false);
      setReportForm({ incident_date: '', incident_type: '', severity: 'medium', description: '', location: '', persons_involved: '', immediate_action_taken: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: { id: string; [key: string]: any }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from('safeguarding_incidents').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['safeguarding-incidents'] });
      toast({ title: 'Incident updated' });
    },
  });

  const criticalUnassigned = incidents.filter((i: any) => i.severity === 'critical' && !i.assigned_to);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" /> Safeguarding
          </h1>
          {activeTab === 'incidents' && (
          <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Report Incident</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" /> CONFIDENTIAL — Safeguarding Incident Report
                </DialogTitle>
              </DialogHeader>
              <Alert variant="destructive" className="mb-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>This report is confidential and will only be visible to authorised staff.</AlertDescription>
              </Alert>
              <form onSubmit={e => { e.preventDefault(); createMutation.mutate(reportForm); }} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Date *</Label>
                    <Input type="date" value={reportForm.incident_date} onChange={e => setReportForm(p => ({ ...p, incident_date: e.target.value }))} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Severity</Label>
                    <Select value={reportForm.severity} onValueChange={v => setReportForm(p => ({ ...p, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Type *</Label>
                  <Select value={reportForm.incident_type} onValueChange={v => setReportForm(p => ({ ...p, incident_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {INCIDENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Description *</Label>
                  <Textarea value={reportForm.description} onChange={e => setReportForm(p => ({ ...p, description: e.target.value }))} rows={4} required />
                </div>
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input value={reportForm.location} onChange={e => setReportForm(p => ({ ...p, location: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Persons Involved</Label>
                  <Textarea value={reportForm.persons_involved} onChange={e => setReportForm(p => ({ ...p, persons_involved: e.target.value }))} rows={2} />
                </div>
                <div className="space-y-1">
                  <Label>Immediate Action Taken</Label>
                  <Textarea value={reportForm.immediate_action_taken} onChange={e => setReportForm(p => ({ ...p, immediate_action_taken: e.target.value }))} rows={2} />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit Report'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="whistleblower">Whistleblower</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="mt-4 space-y-4">
        {criticalUnassigned.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{criticalUnassigned.length} critical incident(s) not yet assigned. Immediate action required.</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : incidents.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No incidents reported</TableCell></TableRow>
                  ) : incidents.map((i: any) => (
                    <TableRow key={i.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(i)}>
                      <TableCell className="font-mono text-xs">{i.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="text-sm">{new Date(i.incident_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm capitalize">{i.incident_type.replace('_', ' ')}</TableCell>
                      <TableCell><Badge className={severityColors[i.severity]}>{i.severity}</Badge></TableCell>
                      <TableCell><Badge className={statusColors[i.status]}>{i.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-sm">{staff.find((s: any) => s.user_id === i.assigned_to)?.full_name || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="whistleblower" className="mt-4">
            <WhistleblowerInner />
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selected && (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle className="text-destructive">Incident {selected.id.slice(0, 8).toUpperCase()}</SheetTitle>
              </SheetHeader>
              <div className="space-y-3">
                <div><Label className="text-xs text-muted-foreground">Date</Label><p className="text-sm">{new Date(selected.incident_date).toLocaleDateString()}</p></div>
                <div><Label className="text-xs text-muted-foreground">Type</Label><p className="text-sm capitalize">{selected.incident_type.replace('_', ' ')}</p></div>
                <div><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm whitespace-pre-wrap">{selected.description}</p></div>
                {selected.location && <div><Label className="text-xs text-muted-foreground">Location</Label><p className="text-sm">{selected.location}</p></div>}
                {selected.persons_involved && <div><Label className="text-xs text-muted-foreground">Persons Involved</Label><p className="text-sm">{selected.persons_involved}</p></div>}
                {selected.immediate_action_taken && <div><Label className="text-xs text-muted-foreground">Immediate Action</Label><p className="text-sm">{selected.immediate_action_taken}</p></div>}

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selected.status} onValueChange={v => {
                    const updates: any = { id: selected.id, status: v };
                    if (v === 'closed') updates.closed_at = new Date().toISOString();
                    updateMutation.mutate(updates);
                    setSelected({ ...selected, status: v });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="under_investigation">Under Investigation</SelectItem>
                      <SelectItem value="referred_externally">Referred Externally</SelectItem>
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

                <Button variant="destructive" className="w-full" onClick={() => {
                  updateMutation.mutate({ id: selected.id, escalated_at: new Date().toISOString() });
                  toast({ title: 'Incident escalated', description: 'Organization admin has been notified' });
                }}>
                  Escalate to Admin
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
