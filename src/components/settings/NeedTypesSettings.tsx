import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, HeartHandshake, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNeedTypes, useSaveNeedType, useDeleteNeedType, type NeedType } from '@/hooks/useNeeds';

export function NeedTypesSettings() {
  const { data: types = [], isLoading } = useNeedTypes(true);
  const save = useSaveNeedType();
  const remove = useDeleteNeedType();
  const [editing, setEditing] = useState<Partial<NeedType> | null>(null);

  const move = async (t: NeedType, dir: -1 | 1) => {
    const sorted = [...types].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === t.id);
    const other = sorted[idx + dir];
    if (!other) return;
    await save.mutateAsync({ id: t.id, sort_order: other.sort_order });
    await save.mutateAsync({ id: other.id, sort_order: t.sort_order });
  };

  const onSave = async () => {
    if (!editing?.label?.trim()) return toast.error('Label is required');
    const key = (editing.key || editing.label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    try {
      await save.mutateAsync({ ...editing, key, sort_order: editing.sort_order ?? (types.length + 1) });
      toast.success('Saved');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    }
  };

  const onDelete = async (t: NeedType) => {
    if (!confirm(`Delete "${t.label}"? If it's in use, deactivate it instead.`)) return;
    try {
      await remove.mutateAsync(t.id);
      toast.success('Deleted');
    } catch (e: any) {
      toast.error(e?.message?.includes('violates') ? 'In use — deactivate instead.' : (e?.message || 'Failed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Needs / Support types</h2>
          <p className="text-sm text-muted-foreground">The catalogue of support this organisation provides. Needs are attached to beneficiaries and addressed by projects and sponsorship packages.</p>
        </div>
        <Button onClick={() => setEditing({ is_active: true, sort_order: types.length + 1 })}>
          <Plus className="h-4 w-4 mr-1" /> Add type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><HeartHandshake className="h-4 w-4" /> Types</CardTitle>
          <CardDescription>Reorder, edit, deactivate. Delete only when a type is not in use anywhere.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : types.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No need types yet.</p>
          ) : (
            <ul className="divide-y">
              {[...types].sort((a, b) => a.sort_order - b.sort_order).map((t, i, arr) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex flex-col">
                    <button className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0} onClick={() => move(t, -1)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === arr.length - 1} onClick={() => move(t, 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{t.label}</span>
                      <code className="text-[11px] text-muted-foreground">{t.key}</code>
                      {!t.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                  </div>
                  <div className="text-xs text-muted-foreground w-24 text-right">
                    {t.default_cost != null ? `${t.default_currency || 'KES'} ${Number(t.default_cost).toLocaleString()}` : '—'}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit need type' : 'Add need type'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Label *</Label>
                <Input value={editing.label || ''} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="e.g. Psychosocial Support" />
              </div>
              <div>
                <Label>Machine key (optional)</Label>
                <Input value={editing.key || ''} onChange={(e) => setEditing({ ...editing, key: e.target.value })} placeholder="auto from label" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Default cost</Label>
                  <Input type="number" value={editing.default_cost ?? ''} onChange={(e) => setEditing({ ...editing, default_cost: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={editing.default_currency || 'KES'} onChange={(e) => setEditing({ ...editing, default_currency: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Icon (lucide name)</Label>
                <Input value={editing.icon || ''} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="e.g. GraduationCap" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label>Active</Label>
                <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={onSave} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}