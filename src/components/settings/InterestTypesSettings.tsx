import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useInterestTypes, useSaveInterestType, useDeleteInterestType,
  type InterestType, type InterestKind,
} from '@/hooks/useInterestTypes';

function List({ kind, title, blurb }: { kind: InterestKind; title: string; blurb: string }) {
  const { data: types = [], isLoading } = useInterestTypes(kind, true);
  const save = useSaveInterestType();
  const remove = useDeleteInterestType();
  const [editing, setEditing] = useState<Partial<InterestType> | null>(null);

  const onSave = async () => {
    if (!editing?.label?.trim()) return toast.error('Label is required');
    const key = (editing.key || editing.label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    try {
      await save.mutateAsync({ ...editing, kind, key, sort_order: editing.sort_order ?? types.length + 1 });
      toast.success('Saved');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> {title}</CardTitle>
          <CardDescription>{blurb}</CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing({ is_active: true })}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : types.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nothing in the catalogue yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <div key={t.id} className="flex items-center gap-1 rounded-full border pl-3 pr-1 py-1">
                <span className="text-sm">{t.label}</span>
                {!t.is_active && <Badge variant="outline" className="text-[10px]">Off</Badge>}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(t)}><Pencil className="h-3 w-3" /></Button>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6"
                  onClick={async () => {
                    if (!confirm(`Remove "${t.label}"?`)) return;
                    try { await remove.mutateAsync(t.id); toast.success('Removed'); }
                    catch { toast.error('Could not remove — deactivate instead'); }
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} {kind}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Label *</Label>
                <Input value={editing.label || ''} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder={kind === 'hobby' ? 'e.g. Football' : 'e.g. Coding'} />
              </div>
              <div className="flex items-center justify-between pt-1">
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
    </Card>
  );
}

export function InterestTypesSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Hobbies & interests</h2>
        <p className="text-sm text-muted-foreground">
          The catalogue offered when staff write a personal bio. Staff can always type something that isn't on the list.
        </p>
      </div>
      <List kind="hobby" title="Hobbies" blurb="Things they do — sport, music, crafts." />
      <List kind="interest" title="Interests" blurb="Subjects and fields they care about." />
    </div>
  );
}
