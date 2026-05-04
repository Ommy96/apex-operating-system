import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Download, ArrowRightLeft, Power, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function DangerZoneSection() {
  const { currentOrganization } = useOrganization();
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;
  const orgName = currentOrganization?.organization_name || '';
  const [confirmDelete, setConfirmDelete] = useState('');
  const [exporting, setExporting] = useState(false);

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Only organisation admins can access the danger zone.
        </CardContent>
      </Card>
    );
  }

  const requestExport = async () => {
    setExporting(true);
    try {
      // Lightweight export: collect main tables to a single JSON file
      const orgId = currentOrganization?.organization_id;
      if (!orgId) throw new Error('No organisation');
      const tables = ['organizations', 'beneficiaries', 'programs', 'projects', 'financial_transactions'];
      const out: Record<string, unknown> = {};
      for (const t of tables) {
        const { data } = await supabase.from(t as any).select('*').eq(t === 'organizations' ? 'id' : 'organization_id', orgId);
        out[t] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${orgName.replace(/\s+/g, '_')}-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export downloaded' });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const requestDeletion = async () => {
    const orgId = currentOrganization?.organization_id;
    if (!orgId) return;
    // Soft signal — record an audit log requesting deletion
    const { error } = await supabase.from('audit_logs' as any).insert({
      event_type: 'organization_deletion_requested',
      entity_type: 'organization',
      entity_id: orgId,
      metadata: { requested_org_name: orgName, requested_at: new Date().toISOString() },
    });
    if (error) {
      toast({ title: 'Could not submit request', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Deletion requested',
      description: 'Infera Tech Solutions has been notified. A super admin will confirm before any data is removed.',
    });
    setConfirmDelete('');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5" />
        <p className="text-xs text-rose-700">
          Actions in this section cannot be undone. Proceed with extreme caution.
        </p>
      </div>

      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" /> Export all organisation data</CardTitle>
          <CardDescription>Download a JSON snapshot of beneficiaries, programmes, financial records, and key tables.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={requestExport} disabled={exporting}>
            {exporting ? 'Preparing…' : 'Export all data'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Transfer organisation ownership</CardTitle>
          <CardDescription>Hand over admin ownership to another staff member.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled title="Contact Infera Tech Solutions to transfer ownership">
            Contact support to transfer
          </Button>
        </CardContent>
      </Card>

      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Power className="h-4 w-4" /> Deactivate organisation</CardTitle>
          <CardDescription>Suspend access. Data is preserved. Contact support to reactivate.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>Contact support to deactivate</Button>
        </CardContent>
      </Card>

      <Card className="border-rose-300 bg-rose-50/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-rose-700">
            <Trash2 className="h-4 w-4" /> Delete organisation
          </CardTitle>
          <CardDescription className="text-rose-700/80">
            Permanently delete this organisation and ALL its data. This cannot be undone. Requires confirmation by Infera Tech Solutions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-rose-400 text-rose-700 hover:bg-rose-100 hover:text-rose-700">
                Request deletion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request organisation deletion</DialogTitle>
                <DialogDescription>
                  This sends a deletion request to Infera Tech Solutions super admins. To confirm, type <span className="font-mono font-bold">DELETE {orgName}</span> below.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Confirmation</Label>
                <Input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder={`DELETE ${orgName}`} />
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={confirmDelete !== `DELETE ${orgName}`}
                  onClick={requestDeletion}
                >
                  Submit deletion request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}