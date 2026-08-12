import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDocumentTypes, useSaveDocumentType, useDeleteDocumentType, type DocumentType } from '@/hooks/useDocumentTypes';

export function DocumentTypesSettings() {
  const { data: types = [], isLoading } = useDocumentTypes(true);
  const save = useSaveDocumentType();
  const remove = useDeleteDocumentType();
  const [editing, setEditing] = useState<Partial<DocumentType> | null>(null);

  const onSave = async () => {
    if (!editing?.label?.trim()) return toast.error('Label is required');
    const key = (editing.key || editing.label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    try {
      await save.mutateAsync({ ...editing, key, sort_order: editing.sort_order ?? types.length + 1 });
      toast.success('Saved');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    }
  };

  const onDelete = async (t: DocumentType) => {
    if (!confirm(`Delete "${t.label}"? If it is in use, deactivate it instead.`)) return;
    try {
      await remove.mutateAsync(t.id);
      toast.success('Deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Document types</h2>
          <p className="text-sm text-muted-foreground">
            The kinds of document this organisation collects. Staff can still type a free name at upload — this list is a
            convenience, not a constraint.
          </p>
        </div>
        <Button onClick={() => setEditing({ is_active: true, is_consent_type: false, requires_expiry: false, sort_order: types.length + 1 })}>
          <Plus className="h-4 w-4 mr-1" /> Add type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Types</CardTitle>
          <CardDescription>Consent types carry a signed date and expiry, and gate photo use in donor reports and exports.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : types.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No document types yet.</p>
          ) : (
            <ul className="divide-y">
              {types.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{t.label}</span>
                      <code className="text-[11px] text-muted-foreground">{t.key}</code>
                      {t.is_consent_type && <Badge className="text-[10px]">Consent</Badge>}
                      {t.requires_expiry && <Badge variant="outline" className="text-[10px]">Expires</Badge>}
                      {!t.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                  </div>
                  <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" aria-label="Delete" onClick={() => onDelete(t)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit document type' : 'Add document type'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Label *</Label><Input value={editing?.label || ''} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={editing?.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="flex items-center justify-between"><Label>Consent document</Label><Switch checked={!!editing?.is_consent_type} onCheckedChange={(v) => setEditing({ ...editing, is_consent_type: v })} /></div>
            <div className="flex items-center justify-between"><Label>Requires expiry date</Label><Switch checked={!!editing?.requires_expiry} onCheckedChange={(v) => setEditing({ ...editing, requires_expiry: v })} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={onSave} disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
