import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizeValue,
  aggregateNormalized,
  type NormalizedScale,
  type SourceType,
  type Mapping,
} from '@/lib/indicatorNormalization';

export type ProgramRollup = {
  id: string;
  organization_id: string;
  program_id: string;
  key: string;
  label: string;
  description: string | null;
  normalized_scale: NormalizedScale;
  direction: 'higher_is_better' | 'lower_is_better';
  target_value: number | null;
  is_active: boolean;
};

export type RollupTranslation = {
  id: string;
  organization_id: string;
  program_rollup_indicator_id: string;
  source_project_id: string;
  source_indicator_key: string;
  source_indicator_id: string | null;
  source_type: SourceType;
  mapping: Mapping;
  weight: number;
};

export function useProgramRollups(programId: string | undefined, organizationId: string | undefined) {
  const qc = useQueryClient();

  const rollupsQ = useQuery({
    queryKey: ['program-rollups', programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from('program_rollup_indicators' as any)
        .select('*')
        .eq('program_id', programId)
        .order('label');
      if (error) throw error;
      return (data || []) as unknown as ProgramRollup[];
    },
    enabled: !!programId,
  });

  const translationsQ = useQuery({
    queryKey: ['program-rollup-translations', programId],
    queryFn: async () => {
      if (!rollupsQ.data?.length) return [];
      const ids = rollupsQ.data.map((r) => r.id);
      const { data, error } = await supabase
        .from('program_rollup_translations' as any)
        .select('*')
        .in('program_rollup_indicator_id', ids);
      if (error) throw error;
      return (data || []) as unknown as RollupTranslation[];
    },
    enabled: !!rollupsQ.data?.length,
  });

  const projectsQ = useQuery({
    queryKey: ['program-projects-for-rollups', programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('program_id', programId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  // Pull all indicators (with latest value) for source lookup by code
  const sourcePool = useQuery({
    queryKey: ['program-rollup-source-pool', programId, organizationId],
    queryFn: async () => {
      if (!organizationId || !programId) return [];
      const { data, error } = await supabase
        .from('indicators')
        .select('id, code, name, organization_id, program_ids')
        .eq('organization_id', organizationId)
        .contains('program_ids', [programId]);
      if (error) throw error;
      const ids = (data || []).map((i: any) => i.id);
      if (!ids.length) return (data || []).map((i: any) => ({ ...i, latest_value: null }));
      const { data: values } = await supabase
        .from('indicator_values')
        .select('indicator_id, actual_value, period_end, created_at')
        .in('indicator_id', ids)
        .order('period_end', { ascending: false })
        .limit(2000);
      const latest: Record<string, number> = {};
      for (const v of values || []) {
        if (!(v.indicator_id in latest)) latest[v.indicator_id] = Number(v.actual_value);
      }
      return (data || []).map((i: any) => ({ ...i, latest_value: latest[i.id] ?? null }));
    },
    enabled: !!organizationId && !!programId,
  });

  // Compute aggregated rollups + per-project contributions
  const aggregated = useMemo(() => {
    if (!rollupsQ.data || !translationsQ.data) return [];
    const projectsById = new Map((projectsQ.data || []).map((p: any) => [p.id, p]));
    return rollupsQ.data.map((r) => {
      const translations = (translationsQ.data || []).filter(
        (t) => t.program_rollup_indicator_id === r.id,
      );
      const contributions = translations.map((t) => {
        // Find source indicator value by code (or by id if set)
        const src = (sourcePool.data || []).find((i: any) =>
          t.source_indicator_id ? i.id === t.source_indicator_id : i.code === t.source_indicator_key,
        );
        const raw = src?.latest_value ?? null;
        const normalized = normalizeValue(raw, t.source_type, t.mapping, r.normalized_scale);
        return {
          translationId: t.id,
          projectId: t.source_project_id,
          projectName: (projectsById.get(t.source_project_id) as any)?.name || 'Project',
          sourceKey: t.source_indicator_key,
          sourceType: t.source_type,
          weight: t.weight,
          raw,
          normalized,
        };
      });
      const value = aggregateNormalized(
        contributions.map((c) => ({ value: c.normalized, weight: c.weight })),
      );
      return { rollup: r, contributions, value };
    });
  }, [rollupsQ.data, translationsQ.data, projectsQ.data, sourcePool.data]);

  const upsertRollup = useMutation({
    mutationFn: async (payload: Partial<ProgramRollup> & { id?: string }) => {
      const { id, ...row } = payload as any;
      if (id) {
        const { error } = await supabase.from('program_rollup_indicators' as any).update(row).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('program_rollup_indicators' as any).insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-rollups', programId] }),
  });

  const deleteRollup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('program_rollup_indicators' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-rollups', programId] }),
  });

  const upsertTranslation = useMutation({
    mutationFn: async (payload: Partial<RollupTranslation> & { id?: string }) => {
      const { id, ...row } = payload as any;
      if (id) {
        const { error } = await supabase.from('program_rollup_translations' as any).update(row).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('program_rollup_translations' as any).insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-rollup-translations', programId] }),
  });

  const deleteTranslation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('program_rollup_translations' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-rollup-translations', programId] }),
  });

  return {
    rollups: rollupsQ.data || [],
    translations: translationsQ.data || [],
    projects: projectsQ.data || [],
    sourceIndicators: sourcePool.data || [],
    aggregated,
    isLoading: rollupsQ.isLoading || translationsQ.isLoading,
    upsertRollup,
    deleteRollup,
    upsertTranslation,
    deleteTranslation,
  };
}