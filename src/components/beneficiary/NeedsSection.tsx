import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, HeartHandshake, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBeneficiaryNeeds, useNeedTypes, useSaveBeneficiaryNeed, useDeleteBeneficiaryNeed, type BeneficiaryNeed, type NeedType } from '@/hooks/useNeeds';

const STATUS_STYLES: Record<string, string> = {
  unmet: 'bg-red-50 text-red-700 border-red-200',
  partially_met: 'bg-amber-50 text-amber-800 border-amber-200',
  met: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const STATUS_LABEL: Record<string, string> = {
  unmet: 'Unmet', partially_met: 'Partially met', met: 'Met',
};
const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-slate-100 text-slate-700',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export function NeedsSection({ beneficiaryId }: { beneficiaryId: string }) {
  const { data: needs = [], isLoading } = useBeneficiaryNeeds(beneficiaryId);
  const { data: types = [] } = useNeedTypes(false);
  const save = useSaveBeneficiaryNeed();
  const remove = useDeleteBeneficiaryNeed();
  const [editing, setEditing] = useState<Partial<BeneficiaryNeed> | null>(null);

  const summary = useMemo(() => {
    const total = needs.length;
    const met = needs.filter((n) => n.status === 'met').length;
    const unmet = needs.filter((n) => n.status !== 'met');
    const unmetCost = unmet.reduce((s, n) => s + (Number(n.estimated_cost) || 0), 0);
    const currency = needs.find((n) => n.currency)?.currency || 'KES';
    return { total, met, unmetCost, currency };
  }, [needs]);

  const availableTypes = useMemo(() => {
    const used = new Set(needs.map((n) => n.need_type_id));
    return types.filter((t) => editing?.need_type_id === t.id || !used.has(t.id));
  }, [types, needs, editing]);

  const openAdd = () => setEditing({ status: 'unmet', priority: 'normal' });
  const openEdit = (n: BeneficiaryNeed) => setEditing({ ...n });

  const onPickType = (id: string) => {
    const t = types.find((x) => x.id === id);
    setEditing((p) => ({
      ...p,
      need_type_id: id,
      estimated_cost: p?.id ? p.estimated_cost : (t?.default_cost ?? null),
      currency: p?.currency || t?.default_currency || 'KES',
    }));
  };

  const onSave = async () => {
    if (!editing?.need_type_id) return toast.error('Select a need type');
    try {
      await save.mutateAsync({
        id: editing.id,
        beneficiary_id: beneficiaryId,
        need_type_id: editing.need_type_id,
        status: (editing.status as any) || 'unmet',
        priority: (editing.priority as any) || 'normal',
        estimated_cost: editing.estimated_cost ?? null,
        currency: editing.currency || 'KES',
        notes: editing.notes || null,
      } as any);
      setEditing(null);
      toast.success('Saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    }
  };

  const onDelete = async (n: BeneficiaryNeed) => {
    if (!confirm('Remove this need?')) return;
    await remove.mutateAsync({ id: n.id, beneficiary_id: beneficiaryId });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <HeartHandshake className="h-4 w-4" /> Needs
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.total === 0
              ? 'No needs recorded yet.'
              : `${summary.met} of ${summary.total} met · ${summary.currency} ${summary.unmetCost.toLocaleString()} unmet`}
          </p>
        </div>
        <Button size="sm" onClick={openAdd} disabled={availableTypes.length === 0 && !editing}>
          <Plus className="h-4 w-4 mr-1" /> Add need
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : needs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Add the kinds of support this person needs to unlock matching and coverage tracking.</p>
        ) : (
          <ul className="divide-y">
            {needs.map((n) => {
              const t = (n as any).need_type as NeedType | undefined;
              return (
                <li key={n.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{t?.label || 'Unknown'}</span>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[n.status]}`}>{STATUS_LABEL[n.status]}</Badge>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_STYLES[n.priority]}`}>{n.priority}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {n.estimated_cost != null ? `${n.currency || 'KES'} ${Number(n.estimated_cost).toLocaleString()}` : 'No cost set'}
                      {n.met_by_project_id ? ' · met by project' : ''}
                      {n.met_by_sponsorship_id ? ' · met by sponsorship' : ''}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(n)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(n)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit need' : 'Add need'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Need type *</Label>
                <Select value={editing.need_type_id || ''} onValueChange={onPickType} disabled={!!editing.id}>
                  <SelectTrigger><SelectValue placeholder="Choose a type" /></SelectTrigger>
                  <SelectContent>
                    {availableTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estimated cost</Label>
                  <Input type="number" value={editing.estimated_cost ?? ''} onChange={(e) => setEditing({ ...editing, estimated_cost: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={editing.currency || 'KES'} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={editing.priority || 'normal'} onValueChange={(v) => setEditing({ ...editing, priority: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status || 'unmet'} onValueChange={(v) => setEditing({ ...editing, status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unmet">Unmet</SelectItem>
                      <SelectItem value="partially_met">Partially met</SelectItem>
                      <SelectItem value="met">Met</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea rows={2} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={onSave} disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}