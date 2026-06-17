import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export interface BaselineTemplate {
  id: string;
  project_id: string;
  indicator_key: string;
  indicator_label: string;
  value_type: 'numeric' | 'text' | 'percentage' | 'grade_letter' | 'scale_5';
  unit: string | null;
  required: boolean;
  sort_order: number;
}

export interface BaselineValueMap {
  // key = `${project_id}::${indicator_key}` -> raw string from input
  [k: string]: string;
}

interface Props {
  projectIds: string[];
  values: BaselineValueMap;
  onChange: (next: BaselineValueMap) => void;
  onTemplatesLoaded?: (templates: BaselineTemplate[]) => void;
  compact?: boolean;
}

const GRADES = ['A', 'B', 'C', 'D', 'E', 'F'];

export function BaselineIndicatorsInput({ projectIds, values, onChange, onTemplatesLoaded, compact }: Props) {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['project-baseline-indicators', [...projectIds].sort().join(',')],
    queryFn: async () => {
      if (projectIds.length === 0) return [] as BaselineTemplate[];
      const { data, error } = await (supabase as any)
        .from('project_baseline_indicators')
        .select('*')
        .in('project_id', projectIds)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as BaselineTemplate[];
    },
    enabled: projectIds.length > 0,
  });

  useEffect(() => {
    if (onTemplatesLoaded) onTemplatesLoaded(templates);
  }, [templates, onTemplatesLoaded]);

  const byProject = useMemo(() => {
    const m = new Map<string, BaselineTemplate[]>();
    templates.forEach((t) => {
      const arr = m.get(t.project_id) || [];
      arr.push(t);
      m.set(t.project_id, arr);
    });
    return m;
  }, [templates]);

  if (projectIds.length === 0) return null;
  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (templates.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No baseline indicators configured for the selected project(s). You can add them from the project's Activities tab.
      </p>
    );
  }

  const setVal = (k: string, v: string) => onChange({ ...values, [k]: v });

  return (
    <div className="space-y-4">
      {Array.from(byProject.entries()).map(([projectId, list]) => (
        <div key={projectId} className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <div className={compact ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
            {list.map((t) => {
              const k = `${projectId}::${t.indicator_key}`;
              const v = values[k] ?? '';
              return (
                <div key={t.id} className="space-y-1.5">
                  <Label className="text-xs">
                    {t.indicator_label}
                    {t.required && <span className="text-destructive ml-1">*</span>}
                    {t.unit && <span className="text-muted-foreground ml-1 font-normal">({t.unit})</span>}
                  </Label>
                  {t.value_type === 'grade_letter' ? (
                    <Select value={v} onValueChange={(nv) => setVal(k, nv)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select grade" /></SelectTrigger>
                      <SelectContent>
                        {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : t.value_type === 'scale_5' ? (
                    <Select value={v} onValueChange={(nv) => setVal(k, nv)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="1 – 5" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : t.value_type === 'text' ? (
                    <Input value={v} onChange={(e) => setVal(k, e.target.value)} className="h-9" />
                  ) : (
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        value={v}
                        onChange={(e) => setVal(k, e.target.value)}
                        className="h-9 pr-8"
                      />
                      {t.value_type === 'percentage' && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {list.some((t) => !t.required) && (
            <p className="text-[11px] text-muted-foreground italic">
              You can record optional indicators later from the project's M&E tab.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/** Returns missing required keys (`${projectId}::${indicator_key}`) given templates + values. */
export function findMissingRequiredBaselines(templates: BaselineTemplate[], values: BaselineValueMap): string[] {
  return templates
    .filter((t) => t.required)
    .filter((t) => {
      const v = (values[`${t.project_id}::${t.indicator_key}`] ?? '').trim();
      return v.length === 0;
    })
    .map((t) => `${t.project_id}::${t.indicator_key}`);
}

/** Build rows for `beneficiary_baselines` insert. */
export function buildBaselineRows(
  templates: BaselineTemplate[],
  values: BaselineValueMap,
  ctx: { organization_id: string; beneficiary_id: string; captured_by?: string | null; enrollmentByProject?: Record<string, string> },
) {
  const rows: any[] = [];
  templates.forEach((t) => {
    const raw = (values[`${t.project_id}::${t.indicator_key}`] ?? '').trim();
    if (!raw) return;
    const isNumeric = t.value_type === 'numeric' || t.value_type === 'percentage' || t.value_type === 'scale_5';
    rows.push({
      organization_id: ctx.organization_id,
      beneficiary_id: ctx.beneficiary_id,
      project_id: t.project_id,
      enrollment_id: ctx.enrollmentByProject?.[t.project_id] ?? null,
      indicator_key: t.indicator_key,
      indicator_label: t.indicator_label,
      value_numeric: isNumeric ? Number(raw) : null,
      value_text: isNumeric ? null : raw,
      unit: t.unit,
      captured_by: ctx.captured_by ?? null,
    });
  });
  return rows;
}