import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  beneficiaryId: string;
  programId?: string | null;
  projectIds?: string[];
  onCaptureNow?: () => void;
}

export function BeneficiaryBaselinesPopover({ beneficiaryId, programId, projectIds, onCaptureNow }: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['beneficiary-baselines', beneficiaryId, programId, (projectIds || []).join(',')],
    queryFn: async () => {
      let q: any = (supabase as any)
        .from('beneficiary_baselines')
        .select('id, indicator_label, indicator_key, value_numeric, value_text, unit, captured_at, project_id, project:projects(id, name, program_id)')
        .eq('beneficiary_id', beneficiaryId)
        .order('captured_at', { ascending: false });
      if (projectIds && projectIds.length > 0) q = q.in('project_id', projectIds);
      const { data, error } = await q;
      if (error) throw error;
      let list = data || [];
      if (programId) list = list.filter((r: any) => r.project?.program_id === programId);
      return list;
    },
  });

  const hasAny = rows.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px] gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Target className="h-3 w-3" />
          {hasAny ? `Baselines (${rows.length})` : 'Baselines'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Captured baselines</h4>
            {!hasAny && onCaptureNow && (
              <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={onCaptureNow}>
                Capture now
              </Button>
            )}
          </div>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : !hasAny ? (
            <p className="text-xs text-muted-foreground italic">No baselines captured for this programme yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-auto">
              {rows.map((r: any) => {
                const v = r.value_numeric ?? r.value_text;
                return (
                  <div key={r.id} className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{r.indicator_label}</div>
                      {r.project?.name && <div className="text-[10px] text-muted-foreground truncate">{r.project.name}</div>}
                      <div className="text-[10px] text-muted-foreground">{format(new Date(r.captured_at), 'MMM d, yyyy')}</div>
                    </div>
                    <Badge variant="secondary" className="font-mono text-[11px]">{v ?? '—'}{r.unit ? ` ${r.unit}` : ''}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}