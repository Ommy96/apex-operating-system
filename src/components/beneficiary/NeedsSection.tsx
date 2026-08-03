import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, HeartHandshake, Loader2, Sparkles, UserCog, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useBeneficiaryNeeds, useNeedTypes, useSaveBeneficiaryNeed, useDeleteBeneficiaryNeed, useReturnNeedToAuto, type BeneficiaryNeed, type NeedType } from '@/hooks/useNeeds';
import { Checkbox } from '@/components/ui/checkbox';

const STATUS_STYLES: Record<string, string> = {
  unmet: 'status-badge status-badge-danger border-transparent',
  partially_met: 'status-badge status-badge-warning border-transparent',
  met: 'status-badge status-badge-success border-transparent',
};
const STATUS_LABEL: Record<string, string> = {
  unmet: 'Unmet', partially_met: 'Partially met', met: 'Met',
};
const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'status-badge status-badge-muted',
  high: 'status-badge status-badge-warning',
  urgent: 'status-badge status-badge-danger',
};

export function NeedsSection({ beneficiaryId }: { beneficiaryId: string }) {
  const { data: needs = [], isLoading } = useBeneficiaryNeeds(beneficiaryId);
  const { data: types = [] } = useNeedTypes(false);
  const save = useSaveBeneficiaryNeed();
  const remove = useDeleteBeneficiaryNeed();
  const returnToAuto = useReturnNeedToAuto();
  const [editing, setEditing] = useState<Partial<BeneficiaryNeed> | null>(null);
  const [overrideOn, setOverrideOn] = useState(false);

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

  const openAdd = () => { setOverrideOn(false); setEditing({ status: 'unmet', priority: 'normal', status_source: 'auto' } as any); };
  const openEdit = (n: BeneficiaryNeed) => { setOverrideOn(n.status_source === 'manual'); setEditing({ ...n }); };

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
    if (overrideOn && !((editing.manual_status_note || '').trim())) {
      return toast.error('Add a note explaining the manual override');
    }
    try {
      await save.mutateAsync({
        id: editing.id,
        beneficiary_id: beneficiaryId,
        need_type_id: editing.need_type_id,
        status: overrideOn ? ((editing.status as any) || 'unmet') : ((editing.status as any) || 'unmet'),
        status_source: overrideOn ? 'manual' : 'auto',
        manual_status_note: overrideOn ? (editing.manual_status_note || null) : null,
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
              const isManual = n.status_source === 'manual';
              const funded = Number(n.funded_amount || 0);
              const cost = Number(n.estimated_cost || 0);
              return (
                <li key={n.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{t?.label || 'Unknown'}</span>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[n.status]}`}>{STATUS_LABEL[n.status]}</Badge>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_STYLES[n.priority]}`}>{n.priority}</span>
                      {isManual ? (
                        <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded status-badge-warning">
                          <UserCog className="h-3 w-3" /> Manual
                        </span>
                      ) : (
                        <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded status-badge-success">
                          <Sparkles className="h-3 w-3" /> Auto
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {cost > 0
                        ? `${n.currency || 'KES'} ${funded.toLocaleString()} of ${cost.toLocaleString()} funded`
                        : funded > 0
                          ? `${n.currency || 'KES'} ${funded.toLocaleString()} funded · no cost set`
                          : 'No cost set'}
                      {isManual && n.manual_status_note ? ` · "${n.manual_status_note}"` : ''}
                    </div>
                  </div>
                  {isManual && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => returnToAuto.mutate({ id: n.id, beneficiary_id: beneficiaryId })}
                      title="Return to automatic status"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Auto
                    </Button>
                  )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Estimated cost</Label>
                  <Input type="number" value={editing.estimated_cost ?? ''} onChange={(e) => setEditing({ ...editing, estimated_cost: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={editing.currency || 'KES'} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <Select
                    value={editing.status || 'unmet'}
                    onValueChange={(v) => setEditing({ ...editing, status: v as any })}
                    disabled={!overrideOn}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unmet">Unmet</SelectItem>
                      <SelectItem value="partially_met">Partially met</SelectItem>
                      <SelectItem value="met">Met</SelectItem>
                    </SelectContent>
                  </Select>
                  {!overrideOn && (
                    <p className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Auto — derived from funding & enrolments
                      {editing.id && Number(editing.estimated_cost || 0) > 0
                        ? ` (${editing.currency || 'KES'} ${Number((editing as any).funded_amount || 0).toLocaleString()} of ${Number(editing.estimated_cost).toLocaleString()})`
                        : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-dashed p-2">
                <Checkbox
                  id="override-manual"
                  checked={overrideOn}
                  onCheckedChange={(v) => setOverrideOn(!!v)}
                />
                <div className="flex-1">
                  <Label htmlFor="override-manual" className="text-xs font-medium cursor-pointer">Override manually</Label>
                  <p className="text-[10px] text-muted-foreground">Pick a status yourself. A note is required.</p>
                  {overrideOn && (
                    <Textarea
                      rows={2}
                      placeholder="Why is a manual status needed?"
                      className="mt-2"
                      value={editing.manual_status_note || ''}
                      onChange={(e) => setEditing({ ...editing, manual_status_note: e.target.value })}
                    />
                  )}
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