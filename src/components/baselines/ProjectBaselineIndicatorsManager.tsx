import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Target } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { BaselineTemplate } from './BaselineIndicatorsInput';

const VALUE_TYPES = [
  { value: 'numeric', label: 'Numeric' },
  { value: 'text', label: 'Text' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'grade_letter', label: 'Grade letter (A–F)' },
  { value: 'scale_5', label: 'Scale 1–5' },
];

interface Props {
  projectId: string;
  orgId: string;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
}

export function ProjectBaselineIndicatorsManager({ projectId, orgId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BaselineTemplate | null>(null);
  const [form, setForm] = useState<{ indicator_label: string; indicator_key: string; value_type: string; unit: string; required: boolean }>({
    indicator_label: '', indicator_key: '', value_type: 'numeric', unit: '', required: false,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['project-baseline-indicators', projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('project_baseline_indicators')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as BaselineTemplate[];
    },
  });

  const { data: captures = [] } = useQuery({
    queryKey: ['project-baseline-captures', projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('beneficiary_baselines')
        .select('id, indicator_label, value_numeric, value_text, unit, captured_at, beneficiary:beneficiaries(id, first_name, last_name)')
        .eq('project_id', projectId)
        .order('captured_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const reset = () => {
    setEditing(null);
    setForm({ indicator_label: '', indicator_key: '', value_type: 'numeric', unit: '', required: false });
  };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (t: BaselineTemplate) => {
    setEditing(t);
    setForm({ indicator_label: t.indicator_label, indicator_key: t.indicator_key, value_type: t.value_type, unit: t.unit || '', required: t.required });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const key = (form.indicator_key || slugify(form.indicator_label)).trim();
      if (!form.indicator_label.trim() || !key) throw new Error('Label and key are required');
      const payload = {
        organization_id: orgId,
        project_id: projectId,
        indicator_label: form.indicator_label.trim(),
        indicator_key: key,
        value_type: form.value_type,
        unit: form.unit.trim() || null,
        required: form.required,
      };
      if (editing) {
        const { error } = await (supabase as any).from('project_baseline_indicators').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const sort = templates.length;
        const { error } = await (supabase as any).from('project_baseline_indicators').insert({ ...payload, sort_order: sort });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-baseline-indicators', projectId] });
      toast.success(editing ? 'Indicator updated' : 'Indicator added');
      setOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('project_baseline_indicators').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-baseline-indicators', projectId] });
      toast.success('Indicator removed');
    },
  });

  const reorder = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: -1 | 1 }) => {
      const ordered = [...templates].sort((a, b) => a.sort_order - b.sort_order);
      const idx = ordered.findIndex((t) => t.id === id);
      const swap = idx + direction;
      if (idx < 0 || swap < 0 || swap >= ordered.length) return;
      const a = ordered[idx], b = ordered[swap];
      await (supabase as any).from('project_baseline_indicators').update({ sort_order: b.sort_order }).eq('id', a.id);
      await (supabase as any).from('project_baseline_indicators').update({ sort_order: a.sort_order }).eq('id', b.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-baseline-indicators', projectId] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Baseline indicators</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Snapshot values captured when a beneficiary enrolls in this project.</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add indicator</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No indicators yet. Add the first one to start capturing baselines at enrollment.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {templates.map((t, idx) => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === 0} onClick={() => reorder.mutate({ id: t.id, direction: -1 })}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === templates.length - 1} onClick={() => reorder.mutate({ id: t.id, direction: 1 })}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{t.indicator_label}</span>
                    <Badge variant="outline" className="text-[10px]">{t.value_type}</Badge>
                    {t.unit && <span className="text-[11px] text-muted-foreground">{t.unit}</span>}
                    {t.required && <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">required</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{t.indicator_key}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove.mutate(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent captures</h4>
          {captures.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No baselines captured yet.</p>
          ) : (
            <div className="rounded-lg border divide-y max-h-72 overflow-auto">
              {captures.map((c: any) => {
                const v = c.value_numeric ?? c.value_text;
                const name = c.beneficiary ? `${c.beneficiary.first_name ?? ''} ${c.beneficiary.last_name ?? ''}`.trim() : 'Unknown';
                return (
                  <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{name}</div>
                      <div className="text-muted-foreground truncate">{c.indicator_label}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono">{v ?? '—'}{c.unit ? ` ${c.unit}` : ''}</div>
                      <div className="text-[10px] text-muted-foreground">{format(new Date(c.captured_at), 'MMM d, yyyy')}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit indicator' : 'Add baseline indicator'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input value={form.indicator_label} onChange={(e) => setForm((f) => ({ ...f, indicator_label: e.target.value, indicator_key: editing ? f.indicator_key : slugify(e.target.value) }))} placeholder="e.g. Academic average" />
            </div>
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input value={form.indicator_key} onChange={(e) => setForm((f) => ({ ...f, indicator_key: slugify(e.target.value) }))} placeholder="academic_average" disabled={!!editing} className="font-mono text-xs" />
              <p className="text-[11px] text-muted-foreground">Stable identifier used in reports. Cannot change after creation.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Value type *</Label>
                <Select value={form.value_type} onValueChange={(v) => setForm((f) => ({ ...f, value_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VALUE_TYPES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="e.g. KES, kg" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.required} onCheckedChange={(v) => setForm((f) => ({ ...f, required: !!v }))} />
              Required at enrollment
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Editing an indicator does not alter already-captured baselines.</p>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}