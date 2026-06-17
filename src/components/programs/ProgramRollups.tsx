import { useState } from 'react';
import { useProgramRollups, type ProgramRollup, type RollupTranslation } from '@/hooks/useProgramRollups';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Edit3, Trash2, Layers, Info, ArrowDownUp, GitMerge } from 'lucide-react';
import { toast } from 'sonner';
import type { Mapping, NormalizedScale, SourceType } from '@/lib/indicatorNormalization';

const SCALES: { value: NormalizedScale; label: string }[] = [
  { value: 'percentage_0_100', label: 'Percentage 0–100' },
  { value: 'count', label: 'Count' },
  { value: 'scale_5', label: '5-point scale' },
  { value: 'binary', label: 'Binary (Yes/No)' },
];

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'numeric', label: 'Numeric (custom range)' },
  { value: 'percentage', label: 'Percentage 0–100' },
  { value: 'grade_letter', label: 'Grade letter (A–F)' },
  { value: 'scale_5', label: '5-point scale' },
  { value: 'binary', label: 'Binary' },
];

export function ProgramRollups({ programId }: { programId: string }) {
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const r = useProgramRollups(programId, orgId);
  const [editing, setEditing] = useState<Partial<ProgramRollup> | null>(null);
  const [mappingFor, setMappingFor] = useState<ProgramRollup | null>(null);

  if (r.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Roll-up indicators</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Define program-wide KPIs and tell us how each project's raw measure
            (grade letter, custom scale, percentage…) translates to the program's
            normalized scale.
          </p>
        </div>
        <Button onClick={() => setEditing({})}>
          <Plus className="h-4 w-4 mr-1" /> New roll-up
        </Button>
      </div>

      {r.aggregated.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-foreground">No roll-up indicators yet</p>
            <p className="text-sm mt-1">Add one and start mapping project indicators into it.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {r.aggregated.map(({ rollup, value, contributions }) => (
          <Card key={rollup.id} className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {rollup.label}
                    <Badge variant="outline" className="text-[10px] font-mono">{rollup.key}</Badge>
                  </CardTitle>
                  {rollup.description && (
                    <CardDescription className="text-xs mt-1">{rollup.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(rollup)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Delete this roll-up and all its translations?')) {
                        r.deleteRollup.mutate(rollup.id, {
                          onSuccess: () => toast.success('Roll-up deleted'),
                          onError: (e: any) => toast.error(e.message),
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <p className="text-3xl font-bold text-foreground">
                        {value === null
                          ? '—'
                          : rollup.normalized_scale === 'percentage_0_100'
                          ? `${value.toFixed(1)}%`
                          : value.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Info className="h-3 w-3" />
                        {contributions.length} project translation{contributions.length === 1 ? '' : 's'} ·{' '}
                        {SCALES.find((s) => s.value === rollup.normalized_scale)?.label}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    {contributions.length === 0 ? (
                      <p className="text-xs">No translations defined yet.</p>
                    ) : (
                      <div className="space-y-1.5 text-xs">
                        <p className="font-semibold">Contributions</p>
                        {contributions.map((c) => (
                          <div key={c.translationId} className="flex justify-between gap-3">
                            <span className="truncate">
                              {c.projectName}{' '}
                              <span className="text-muted-foreground">({c.sourceKey})</span>
                            </span>
                            <span className="font-mono">
                              {c.raw == null
                                ? 'no data'
                                : `${c.raw} → ${c.normalized?.toFixed(1) ?? '—'}`}{' '}
                              <span className="text-muted-foreground">w{c.weight}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setMappingFor(rollup)}
              >
                <GitMerge className="h-4 w-4 mr-1" /> Manage project translations ({contributions.length})
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <RollupEditor
        open={!!editing}
        initial={editing}
        onClose={() => setEditing(null)}
        onSave={(data) => {
          r.upsertRollup.mutate(
            { ...data, organization_id: orgId, program_id: programId } as any,
            {
              onSuccess: () => {
                toast.success('Roll-up saved');
                setEditing(null);
              },
              onError: (e: any) => toast.error(e.message),
            },
          );
        }}
      />

      {mappingFor && (
        <TranslationsDialog
          open
          rollup={mappingFor}
          translations={r.translations.filter((t) => t.program_rollup_indicator_id === mappingFor.id)}
          projects={r.projects}
          sourceIndicators={r.sourceIndicators}
          onClose={() => setMappingFor(null)}
          onUpsert={(payload) =>
            r.upsertTranslation.mutate(
              { ...payload, organization_id: orgId, program_rollup_indicator_id: mappingFor.id } as any,
              {
                onSuccess: () => toast.success('Translation saved'),
                onError: (e: any) => toast.error(e.message),
              },
            )
          }
          onDelete={(id) =>
            r.deleteTranslation.mutate(id, {
              onSuccess: () => toast.success('Translation removed'),
              onError: (e: any) => toast.error(e.message),
            })
          }
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Roll-up editor dialog
// ─────────────────────────────────────────────
function RollupEditor({
  open, initial, onClose, onSave,
}: {
  open: boolean;
  initial: Partial<ProgramRollup> | null;
  onClose: () => void;
  onSave: (data: Partial<ProgramRollup>) => void;
}) {
  const [form, setForm] = useState<Partial<ProgramRollup>>(initial || {});

  // reset form when opening
  // eslint-disable-next-line react-hooks/exhaustive-deps
  if (open && form.id !== initial?.id) setForm(initial || {});

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.id ? 'Edit roll-up' : 'New roll-up indicator'}</DialogTitle>
          <DialogDescription>Define a program-level KPI fed by project indicators.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Key</Label>
              <Input
                placeholder="overall_academic_performance"
                value={form.key || ''}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input
                placeholder="Overall academic performance"
                value={form.label || ''}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Normalized scale</Label>
              <Select
                value={form.normalized_scale || 'percentage_0_100'}
                onValueChange={(v) => setForm({ ...form, normalized_scale: v as NormalizedScale })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCALES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Direction</Label>
              <Select
                value={form.direction || 'higher_is_better'}
                onValueChange={(v) => setForm({ ...form, direction: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="higher_is_better">Higher is better</SelectItem>
                  <SelectItem value="lower_is_better">Lower is better</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!form.key || !form.label) {
                toast.error('Key and label are required');
                return;
              }
              onSave({
                ...form,
                normalized_scale: form.normalized_scale || 'percentage_0_100',
                direction: form.direction || 'higher_is_better',
              });
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Translations dialog (per roll-up)
// ─────────────────────────────────────────────
function TranslationsDialog({
  open, rollup, translations, projects, sourceIndicators, onClose, onUpsert, onDelete,
}: {
  open: boolean;
  rollup: ProgramRollup;
  translations: RollupTranslation[];
  projects: any[];
  sourceIndicators: any[];
  onClose: () => void;
  onUpsert: (payload: Partial<RollupTranslation>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Partial<RollupTranslation> | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project translations · {rollup.label}</DialogTitle>
            <DialogDescription>
              Map a project indicator into <span className="font-mono">{rollup.key}</span> ({rollup.normalized_scale}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {translations.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">No translations yet.</p>
            )}
            {translations.map((t) => {
              const proj = projects.find((p: any) => p.id === t.source_project_id);
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{proj?.name || 'Project'}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{t.source_indicator_key}</span> · {t.source_type} · weight {t.weight}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button onClick={() => setEditing({})}>
              <Plus className="h-4 w-4 mr-1" /> Add translation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && (
        <TranslationEditor
          rollup={rollup}
          initial={editing}
          projects={projects}
          sourceIndicators={sourceIndicators}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            onUpsert(data);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Translation editor + per-source-type mapping pickers
// ─────────────────────────────────────────────
function TranslationEditor({
  rollup, initial, projects, sourceIndicators, onClose, onSave,
}: {
  rollup: ProgramRollup;
  initial: Partial<RollupTranslation>;
  projects: any[];
  sourceIndicators: any[];
  onClose: () => void;
  onSave: (data: Partial<RollupTranslation>) => void;
}) {
  const [form, setForm] = useState<Partial<RollupTranslation>>({
    source_type: 'percentage',
    weight: 1,
    mapping: {},
    ...initial,
  });

  const setMapping = (mapping: Mapping) => setForm((f) => ({ ...f, mapping }));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{form.id ? 'Edit translation' : 'Add translation'}</DialogTitle>
          <DialogDescription>
            How does this project's raw measure map onto <span className="font-mono">{rollup.key}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Source project</Label>
              <Select
                value={form.source_project_id || ''}
                onValueChange={(v) => setForm({ ...form, source_project_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Pick project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source indicator key / code</Label>
              <Input
                placeholder="academic_average"
                value={form.source_indicator_key || ''}
                list="rollup-source-keys"
                onChange={(e) => {
                  const key = e.target.value;
                  const match = sourceIndicators.find((i: any) => i.code === key);
                  setForm({ ...form, source_indicator_key: key, source_indicator_id: match?.id || null });
                }}
              />
              <datalist id="rollup-source-keys">
                {sourceIndicators.map((i: any) => (
                  <option key={i.id} value={i.code}>{i.name}</option>
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Source type</Label>
              <Select
                value={form.source_type || 'percentage'}
                onValueChange={(v) => setForm({ ...form, source_type: v as SourceType, mapping: {} })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Weight</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={form.weight ?? 1}
                onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
            <Label className="flex items-center gap-1.5 mb-2">
              <ArrowDownUp className="h-3.5 w-3.5" /> Mapping
            </Label>
            <MappingPicker
              sourceType={form.source_type as SourceType}
              mapping={form.mapping}
              onChange={setMapping}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!form.source_project_id || !form.source_indicator_key) {
                toast.error('Pick a project and source indicator key');
                return;
              }
              onSave(form);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MappingPicker({
  sourceType, mapping, onChange,
}: {
  sourceType: SourceType;
  mapping: Mapping;
  onChange: (m: Mapping) => void;
}) {
  if (sourceType === 'percentage' || sourceType === 'binary') {
    return (
      <p className="text-xs text-muted-foreground">
        No mapping needed — values are interpreted directly.
      </p>
    );
  }

  if (sourceType === 'grade_letter') {
    const defaults = { A: 95, B: 85, C: 75, D: 65, E: 50, F: 35 };
    const current: Record<string, number> = (mapping && typeof mapping === 'object' && !Array.isArray(mapping) && !(mapping as any).type)
      ? (mapping as any)
      : defaults;
    return (
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Object.keys(defaults).map((letter) => (
          <div key={letter} className="space-y-1">
            <Label className="text-xs">{letter}</Label>
            <Input
              type="number"
              min={0} max={100}
              value={current[letter] ?? ''}
              onChange={(e) =>
                onChange({ ...current, [letter]: Number(e.target.value) })
              }
            />
          </div>
        ))}
      </div>
    );
  }

  if (sourceType === 'scale_5') {
    const defaults = { '1': 20, '2': 40, '3': 60, '4': 80, '5': 100 };
    const current: Record<string, number> = (mapping && typeof mapping === 'object' && !Array.isArray(mapping) && !(mapping as any).type)
      ? (mapping as any)
      : defaults;
    return (
      <div className="grid grid-cols-5 gap-2">
        {Object.keys(defaults).map((k) => (
          <div key={k} className="space-y-1">
            <Label className="text-xs">Step {k}</Label>
            <Input
              type="number"
              min={0} max={100}
              value={current[k] ?? ''}
              onChange={(e) => onChange({ ...current, [k]: Number(e.target.value) })}
            />
          </div>
        ))}
      </div>
    );
  }

  // numeric → linear range
  const m = (mapping && (mapping as any).type === 'linear')
    ? (mapping as any)
    : { type: 'linear', from: [0, 100], to: [0, 100] };
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Map a numeric range linearly onto 0–100%.
      </p>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label className="text-xs">Source min</Label>
          <Input type="number" value={m.from[0]} onChange={(e) => onChange({ ...m, from: [Number(e.target.value), m.from[1]] })} />
        </div>
        <div>
          <Label className="text-xs">Source max</Label>
          <Input type="number" value={m.from[1]} onChange={(e) => onChange({ ...m, from: [m.from[0], Number(e.target.value)] })} />
        </div>
        <div>
          <Label className="text-xs">→ Target min</Label>
          <Input type="number" value={m.to?.[0] ?? 0} onChange={(e) => onChange({ ...m, to: [Number(e.target.value), m.to?.[1] ?? 100] })} />
        </div>
        <div>
          <Label className="text-xs">→ Target max</Label>
          <Input type="number" value={m.to?.[1] ?? 100} onChange={(e) => onChange({ ...m, to: [m.to?.[0] ?? 0, Number(e.target.value)] })} />
        </div>
      </div>
    </div>
  );
}