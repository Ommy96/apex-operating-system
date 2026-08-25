import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { isActiveStatus } from '@/lib/statusHelpers';

/**
 * THE canonical counting definitions for the organisation.
 *
 * Every headline count in the app (Dashboard, Beneficiaries, Analytics,
 * reports) MUST read from here so the numbers can never disagree again.
 *
 *   totalBeneficiaries  = all non-deleted beneficiaries in the org
 *   activeBeneficiaries = non-deleted beneficiaries whose status is "active"
 *                         (case-insensitive)
 *
 * The same total/active split is applied to programmes and projects.
 */
export interface CanonicalCounts {
  totalBeneficiaries: number;
  activeBeneficiaries: number;
  /** lifecycle_stage counts — alumni/exited are never folded into active or total */
  waitingListBeneficiaries: number;
  pausedBeneficiaries: number;
  alumniBeneficiaries: number;
  exitedBeneficiaries: number;
  applicantBeneficiaries: number;
  beneficiariesByStage: Record<string, number>;
  beneficiariesByType: Record<string, number>;
  totalProgrammes: number;
  activeProgrammes: number;
  totalProjects: number;
  activeProjects: number;
  totalDonors: number;
  totalHouseholds: number;
}

const EMPTY: CanonicalCounts = {
  totalBeneficiaries: 0,
  activeBeneficiaries: 0,
  waitingListBeneficiaries: 0,
  pausedBeneficiaries: 0,
  alumniBeneficiaries: 0,
  exitedBeneficiaries: 0,
  applicantBeneficiaries: 0,
  beneficiariesByStage: {},
  beneficiariesByType: {},
  totalProgrammes: 0,
  activeProgrammes: 0,
  totalProjects: 0,
  activeProjects: 0,
  totalDonors: 0,
  totalHouseholds: 0,
};

/** Reads every non-deleted beneficiary row in batches (the Data API caps at 1000). */
async function fetchAllBeneficiaryFacts(orgId: string) {
  const rows: Array<{ status: string | null; beneficiary_type: string | null; lifecycle_stage: string | null }> = [];
  const batch = 1000;
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('status, beneficiary_type, lifecycle_stage')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .range(offset, offset + batch - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...(page as any));
    if (page.length < batch) break;
    offset += batch;
  }
  return rows;
}


export function useCanonicalCounts() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const query = useQuery({
    queryKey: ['canonical-counts', orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<CanonicalCounts> => {
      if (!orgId) return EMPTY;

      const [beneficiaryRows, programmesRes, projectsRes, donorsRes, householdsRes] =
        await Promise.all([
          fetchAllBeneficiaryFacts(orgId),
          supabase.from('programs').select('id, is_active').eq('organization_id', orgId),
          supabase.from('projects').select('id, status').eq('organization_id', orgId),
          supabase
            .from('donor_accounts')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId),
          supabase
            .from('households')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId),
        ]);

      if (programmesRes.error) throw programmesRes.error;
      if (projectsRes.error) throw projectsRes.error;

      const beneficiariesByType: Record<string, number> = {};
      const beneficiariesByStage: Record<string, number> = {};
      for (const b of beneficiaryRows) {
        const type = (b.beneficiary_type || 'unknown').toLowerCase();
        beneficiariesByType[type] = (beneficiariesByType[type] || 0) + 1;
        // Lifecycle is authoritative; legacy `status` is the fallback for rows
        // that predate the lifecycle column.
        const stage = normaliseStage(b.lifecycle_stage ?? (isActiveStatus(b.status) ? 'active' : 'exited'));
        beneficiariesByStage[stage] = (beneficiariesByStage[stage] || 0) + 1;
      }

      const programmes = programmesRes.data || [];
      const projects = projectsRes.data || [];

      // "Total" = all non-archived. Alumni and exited are reported separately.
      const totalBeneficiaries = beneficiaryRows.length - (beneficiariesByStage.archived || 0);

      return {
        totalBeneficiaries,
        activeBeneficiaries: beneficiariesByStage.active || 0,
        waitingListBeneficiaries: beneficiariesByStage.waiting_list || 0,
        pausedBeneficiaries: beneficiariesByStage.paused || 0,
        alumniBeneficiaries: beneficiariesByStage.alumni || 0,
        exitedBeneficiaries: beneficiariesByStage.exited || 0,
        applicantBeneficiaries: beneficiariesByStage.applicant || 0,
        beneficiariesByStage,
        beneficiariesByType,
        totalProgrammes: programmes.length,
        activeProgrammes: programmes.filter((p: any) => p.is_active !== false).length,
        totalProjects: projects.length,
        activeProjects: projects.filter((p: any) => isActiveStatus(p.status)).length,
        totalDonors: donorsRes.count || 0,
        totalHouseholds: householdsRes.count || 0,
      };

    },
  });

  return {
    counts: query.data ?? EMPTY,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
