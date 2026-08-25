import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { LifecycleStage } from '@/lib/lifecycle';

const sb = supabase as any;

export interface LifecycleChange {
  beneficiaryId: string;
  stage: LifecycleStage;
  exitReason?: string | null;
  alumniOutcome?: string | null;
  alumniOutcomeNote?: string | null;
  alumniSince?: string | null;
  alumniContactPhone?: string | null;
  alumniContactEmail?: string | null;
  alumniContactConsent?: boolean;
}

/** Moves a beneficiary through the lifecycle and keeps legacy `status` in sync. */
export function useSetLifecycleStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: LifecycleChange) => {
      const { data: user } = await supabase.auth.getUser();
      const legacyStatus =
        c.stage === 'active' ? 'active'
        : c.stage === 'alumni' ? 'graduated'
        : c.stage === 'paused' ? 'inactive'
        : c.stage === 'exited' ? 'inactive'
        : c.stage === 'waiting_list' || c.stage === 'applicant' ? 'inactive'
        : 'inactive';

      const patch: Record<string, any> = {
        lifecycle_stage: c.stage,
        lifecycle_changed_at: new Date().toISOString(),
        lifecycle_changed_by: user?.user?.id ?? null,
        status: legacyStatus,
      };
      if (c.stage === 'exited') patch.exit_reason = c.exitReason ?? null;
      if (c.stage === 'alumni') {
        patch.alumni_since = c.alumniSince || new Date().toISOString().slice(0, 10);
        patch.alumni_outcome = c.alumniOutcome ?? null;
        patch.alumni_outcome_note = c.alumniOutcomeNote ?? null;
        if (c.alumniContactPhone !== undefined) patch.alumni_contact_phone = c.alumniContactPhone;
        if (c.alumniContactEmail !== undefined) patch.alumni_contact_email = c.alumniContactEmail;
        if (c.alumniContactConsent !== undefined) patch.alumni_contact_consent = c.alumniContactConsent;
      }

      const { data, error } = await sb
        .from('beneficiaries')
        .update(patch)
        .eq('id', c.beneficiaryId)
        .select('id, lifecycle_stage')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficiaries'] });
      qc.invalidateQueries({ queryKey: ['beneficiary'] });
      qc.invalidateQueries({ queryKey: ['canonical-counts'] });
      qc.invalidateQueries({ queryKey: ['alumni'] });
      toast.success('Lifecycle updated');
    },
    onError: (e: any) => toast.error(e.message || 'Could not update lifecycle'),
  });
}

export interface AlumniRow {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  beneficiary_code: string | null;
  alumni_since: string | null;
  alumni_outcome: string | null;
  alumni_outcome_note: string | null;
  alumni_contact_phone: string | null;
  alumni_contact_email: string | null;
  alumni_contact_consent: boolean | null;
  year_enrolled: number | null;
  created_at: string;
  totalSupport: number;
  yearsSupported: number;
  lastContact: string | null;
}

/** Alumni list with years supported and total support received. */
export function useAlumni() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    enabled: !!orgId,
    queryKey: ['alumni', orgId],
    queryFn: async (): Promise<AlumniRow[]> => {
      const { data, error } = await sb
        .from('beneficiaries')
        .select(
          'id, display_name, first_name, last_name, beneficiary_code, alumni_since, alumni_outcome, alumni_outcome_note, alumni_contact_phone, alumni_contact_email, alumni_contact_consent, year_enrolled, created_at, updated_at',
        )
        .eq('organization_id', orgId)
        .eq('lifecycle_stage', 'alumni')
        .is('deleted_at', null)
        .order('alumni_since', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as any[];
      if (rows.length === 0) return [];

      const ids = rows.map(r => r.id);
      const { data: donations, error: dErr } = await sb
        .from('beneficiary_donors')
        .select('beneficiary_id, amount_received, donation_date')
        .in('beneficiary_id', ids);
      if (dErr) throw dErr;

      const totals: Record<string, number> = {};
      for (const d of (donations || []) as any[]) {
        totals[d.beneficiary_id] = (totals[d.beneficiary_id] || 0) + Number(d.amount_received || 0);
      }

      return rows.map(r => {
        const startYear = r.year_enrolled || new Date(r.created_at).getFullYear();
        const endYear = r.alumni_since ? new Date(r.alumni_since).getFullYear() : new Date().getFullYear();
        return {
          ...r,
          totalSupport: totals[r.id] || 0,
          yearsSupported: Math.max(1, endYear - startYear),
          lastContact: r.updated_at ?? null,
        } as AlumniRow;
      });
    },
  });
}
