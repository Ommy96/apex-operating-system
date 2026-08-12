import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, HeartPulse, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useLifeEventTypes, useSaveLifeEventType, useDeleteLifeEventType,
  SEVERITY_META, type LifeEventType, type LifeEventSeverity,
} from '@/hooks/useLifeEvents';

const SEVERITIES: LifeEventSeverity[] = ['low', 'moderate', 'high', 'critical'];

export function LifeEventTypesSettings() {
  const { data: types = [], isLoading } = useLifeEventTypes(true);
  const save = useSaveLifeEventType();
  const remove = useDeleteLifeEventType();
  const [editing, setEditing] = useState<Partial<LifeEventType> | null>(null);

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

  const onDelete = async (t: LifeEventType) => {
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
          <h2 className="text-lg font-semibold">Life event types</h2>
          <p className="text-sm text-muted-foreground">
            The catalogue of significant things that happen <em>to</em> the people you serve — bereavement, illness,
            relocation, leaving school, achievements.
          </p>
        </div>
        <Button onClick={() => setEditing({ is_active: true, default_severity: 'moderate', is_sensitive_default: false, sort_order: types.length + 1 })}>
          <Plus className="h-4 w-4 mr-1" /> Add type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><HeartPulse className="h-4 w-4" /> Types</CardTitle>
          <CardDescription>Types marked sensitive default new events to restricted visibility.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : types.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No life event types yet.</p>
          ) : (
            <ul className="divide-y">
              {types.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{t.label}</span>
                      <code className="text-[11px] text-muted-foreground">{t.key}</code>
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: SEVERITY_META[t.default_severity].bg, color: SEVERITY_META[t.default_severity].colour }}>
                        {SEVERITY_META[t.default_severity].label}
                      </span>
                      {t.is_sensitive_default && <Badge variant="outline" className="text-[10px]">Sensitive</Badge>}
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
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit life event type' : 'Add life event type'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Label *</Label><Input value={editing?.label || ''} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={editing?.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div>
              <Label>Default severity</Label>
              <Select value={editing?.default_severity || 'moderate'} onValueChange={(v) => setEditing({ ...editing, default_severity: v as LifeEventSeverity })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{SEVERITY_META[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between"><Label>Sensitive by default</Label><Switch checked={!!editing?.is_sensitive_default} onCheckedChange={(v) => setEditing({ ...editing, is_sensitive_default: v })} /></div>
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
