import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from '@/hooks/use-toast';

export interface IndicatorCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Indicator {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  code: string;
  description: string | null;
  unit: string;
  formula_type: 'count' | 'sum' | 'average' | 'ratio' | 'percentage' | 'custom';
  formula_config: Record<string, any>;
  aggregation_period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  decimal_places: number;
  show_trend: boolean;
  trend_direction: 'up_is_good' | 'down_is_good' | 'neutral';
  is_template: boolean;
  template_source_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category?: IndicatorCategory;
}

export type CreateIndicatorInput = {
  name: string;
  code: string;
  description?: string | null;
  unit: string;
  formula_type: 'count' | 'sum' | 'average' | 'ratio' | 'percentage' | 'custom';
  formula_config: Record<string, any>;
  aggregation_period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  decimal_places?: number;
  show_trend?: boolean;
  trend_direction?: 'up_is_good' | 'down_is_good' | 'neutral';
  category_id?: string | null;
  is_template?: boolean;
  template_source_id?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export interface IndicatorTarget {
  id: string;
  indicator_id: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period_year: number;
  period_value: number;
  target_value: number;
  minimum_value: number | null;
  stretch_value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IndicatorValue {
  id: string;
  indicator_id: string;
  period_start: string;
  period_end: string;
  actual_value: number;
  computed_at: string | null;
  is_manual_override: boolean;
  dimension_key: string | null;
  dimension_value: string | null;
  created_at: string;
  updated_at: string;
}

export interface IndicatorTemplate {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string;
  unit: string;
  formula_type: string;
  formula_config: Record<string, any>;
  aggregation_period: string;
  decimal_places: number;
  trend_direction: string;
  icon: string | null;
  default_target: number | null;
  is_active: boolean;
  created_at: string;
}

export interface IndicatorWithValue extends Indicator {
  current_value?: number;
  previous_value?: number;
  target?: IndicatorTarget;
  trend_percentage?: number;
}

// =============== HOOKS ===============

export function useIndicatorCategories() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ['indicator-categories', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('indicator_categories')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as IndicatorCategory[];
    },
    enabled: !!orgId,
  });
}

export function useIndicators() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ['indicators', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('indicators')
        .select(`
          *,
          category:indicator_categories(*)
        `)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Indicator[];
    },
    enabled: !!orgId,
  });
}

export function useIndicatorTemplates() {
  return useQuery({
    queryKey: ['indicator-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicator_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as IndicatorTemplate[];
    },
  });
}

export function useIndicatorTargets(indicatorId?: string) {
  return useQuery({
    queryKey: ['indicator-targets', indicatorId],
    queryFn: async () => {
      if (!indicatorId) return [];
      const { data, error } = await supabase
        .from('indicator_targets')
        .select('*')
        .eq('indicator_id', indicatorId)
        .order('period_year', { ascending: false })
        .order('period_value', { ascending: false });
      if (error) throw error;
      return data as IndicatorTarget[];
    },
    enabled: !!indicatorId,
  });
}

export function useIndicatorValues(indicatorId?: string, periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ['indicator-values', indicatorId, periodStart, periodEnd],
    queryFn: async () => {
      if (!indicatorId) return [];
      let query = supabase
        .from('indicator_values')
        .select('*')
        .eq('indicator_id', indicatorId)
        .order('period_start', { ascending: false });
      
      if (periodStart) {
        query = query.gte('period_start', periodStart);
      }
      if (periodEnd) {
        query = query.lte('period_end', periodEnd);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as IndicatorValue[];
    },
    enabled: !!indicatorId,
  });
}

// =============== MUTATIONS ===============

export function useCreateIndicatorCategory() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async (category: Omit<IndicatorCategory, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
      const { data, error } = await supabase
        .from('indicator_categories')
        .insert([{
          ...category,
          organization_id: currentOrganization?.organization_id!,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicator-categories'] });
      toast({ title: 'Category created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating category', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateIndicator() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async (indicator: CreateIndicatorInput) => {
      const { data, error } = await supabase
        .from('indicators')
        .insert([{
          name: indicator.name,
          code: indicator.code,
          description: indicator.description ?? null,
          unit: indicator.unit,
          formula_type: indicator.formula_type,
          formula_config: indicator.formula_config,
          aggregation_period: indicator.aggregation_period,
          decimal_places: indicator.decimal_places ?? 0,
          show_trend: indicator.show_trend ?? true,
          trend_direction: indicator.trend_direction ?? 'up_is_good',
          category_id: indicator.category_id ?? null,
          is_template: indicator.is_template ?? false,
          template_source_id: indicator.template_source_id ?? null,
          is_active: indicator.is_active ?? true,
          sort_order: indicator.sort_order ?? 0,
          organization_id: currentOrganization?.organization_id!,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      toast({ title: 'Indicator created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating indicator', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateIndicator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Indicator> & { id: string }) => {
      const { data, error } = await supabase
        .from('indicators')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      toast({ title: 'Indicator updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating indicator', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteIndicator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('indicators')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      toast({ title: 'Indicator deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting indicator', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateIndicatorTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (target: Partial<IndicatorTarget>) => {
      const { data, error } = await supabase
        .from('indicator_targets')
        .insert([target as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicator-targets'] });
      toast({ title: 'Target created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating target', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateIndicatorValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: Partial<IndicatorValue>) => {
      const { data, error } = await supabase
        .from('indicator_values')
        .insert([value as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicator-values'] });
      toast({ title: 'Value recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording value', description: error.message, variant: 'destructive' });
    },
  });
}

export function useImportFromTemplate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async (template: IndicatorTemplate) => {
      const { data, error } = await supabase
        .from('indicators')
        .insert({
          organization_id: currentOrganization?.organization_id,
          name: template.name,
          code: template.code,
          description: template.description,
          unit: template.unit,
          formula_type: template.formula_type,
          formula_config: template.formula_config,
          aggregation_period: template.aggregation_period,
          decimal_places: template.decimal_places,
          trend_direction: template.trend_direction,
          is_template: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      toast({ title: 'Indicator imported from template' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error importing template', description: error.message, variant: 'destructive' });
    },
  });
}
