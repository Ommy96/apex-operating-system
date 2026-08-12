import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';

export type LifeEventSeverity = 'low' | 'moderate' | 'high' | 'critical';
export type FollowUpStatus = 'open' | 'in_progress' | 'resolved';

export interface LifeEventType {
  id: string;
  organization_id: string;
  key: string;
  label: string;
  description: string | null;
  default_severity: LifeEventSeverity;
  is_sensitive_default: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface LifeEvent {
  id: string;
  organization_id: string;
  beneficiary_id: string;
  event_type: string;
  life_event_type_id: string | null;
  occurred_on: string;
  recorded_at: string;
  recorded_by: string | null;
  severity: LifeEventSeverity;
  title: string;
  description: string | null;
  requires_follow_up: boolean;
  follow_up_due: string | null;
  follow_up_status: FollowUpStatus | null;
  is_sensitive: boolean;
  related_person: string | null;
  attachment_urls: string[];
  created_at: string;
}

export const SEVERITY_META: Record<LifeEventSeverity, { label: string; colour: string; bg: string }> = {
  low: { label: 'Low', colour: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--muted))' },
  moderate: { label: 'Moderate', colour: '#B45309', bg: 'rgba(180,83,9,0.10)' },
  high: { label: 'High', colour: '#BE185D', bg: 'rgba(190,24,93,0.10)' },
  critical: { label: 'Critical', colour: '#9F1239', bg: 'rgba(159,18,57,0.14)' },
};

export function useLifeEventTypes(includeInactive = false) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ['life-event-types', orgId, includeInactive],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase.from('life_event_types' as any).select('*').eq('organization_id', orgId!).order('sort_order').order('label');
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as LifeEventType[];
    },
  });
}

export function useSaveLifeEventType() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useMutation({
    mutationFn: async (t: Partial<LifeEventType> & { id?: string }) => {
      const payload: any = { ...t, organization_id: orgId };
      const q = t.id
        ? supabase.from('life_event_types' as any).update(payload).eq('id', t.id).select('*').maybeSingle()
        : supabase.from('life_event_types' as any).insert(payload).select('*').single();
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as LifeEventType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['life-event-types'] }),
  });
}

export function useDeleteLifeEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('life_event_types' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['life-event-types'] }),
  });
}

export function useLifeEvents(beneficiaryId?: string) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ['life-events', orgId, beneficiaryId],
    enabled: !!orgId && !!beneficiaryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('life_events' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .eq('beneficiary_id', beneficiaryId!)
        .is('deleted_at', null)
        .order('occurred_on', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LifeEvent[];
    },
  });
}

export function useSaveLifeEvent(beneficiaryId?: string) {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  return useMutation({
    mutationFn: async (e: Partial<LifeEvent> & { id?: string }) => {
      const payload: any = { ...e, organization_id: orgId, beneficiary_id: e.beneficiary_id ?? beneficiaryId };
      if (!e.id) payload.recorded_by = user?.id ?? null;
      const q = e.id
        ? supabase.from('life_events' as any).update(payload).eq('id', e.id).select('*').maybeSingle()
        : supabase.from('life_events' as any).insert(payload).select('*').single();
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as LifeEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['life-events'] });
      qc.invalidateQueries({ queryKey: ['life-event-followups'] });
    },
  });
}

export function useDeleteLifeEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('life_events' as any)
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id ?? null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['life-events'] });
      qc.invalidateQueries({ queryKey: ['life-event-followups'] });
    },
  });
}

/** Open / in-progress follow-ups across the org — feeds work queues. */
export function useOpenLifeEventFollowUps(limit = 50) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ['life-event-followups', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('life_events' as any)
        .select('id, beneficiary_id, title, severity, occurred_on, follow_up_due, follow_up_status, is_sensitive')
        .eq('organization_id', orgId!)
        .eq('requires_follow_up', true)
        .is('deleted_at', null)
        .in('follow_up_status', ['open', 'in_progress'])
        .order('follow_up_due', { ascending: true, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}
