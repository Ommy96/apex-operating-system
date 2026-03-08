import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface ProjectNeed {
  id: string;
  name: string;
  estimated_cost: number;
  funding_cycle: string;
  funded: number;
  gap: number;
  coverage: number;
}

export interface BeneficiaryCoverage {
  beneficiaryId: string;
  programId: string;
  programName: string;
  totalRequired: number;
  totalReceived: number;
  gap: number;
  coverage: number;
  status: 'fully_funded' | 'partially_funded' | 'unfunded';
  needs: ProjectNeed[];
}

export interface ProgramCoverageSummary {
  programId: string;
  programName: string;
  totalBeneficiaries: number;
  fullyFunded: number;
  partiallyFunded: number;
  unfunded: number;
  totalRequired: number;
  totalReceived: number;
  gap: number;
  coverageRate: number;
  projectGaps: { projectName: string; required: number; received: number; gap: number }[];
  opportunities: { beneficiaryName: string; beneficiaryId: string; projectName: string; amount: number }[];
}

function getStatus(received: number, required: number): 'fully_funded' | 'partially_funded' | 'unfunded' {
  if (required <= 0) return 'fully_funded';
  if (received <= 0) return 'unfunded';
  if (received >= required) return 'fully_funded';
  return 'partially_funded';
}

export function useBeneficiaryCoverage(beneficiaryId: string | undefined) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ['beneficiary-coverage', beneficiaryId, orgId],
    queryFn: async (): Promise<BeneficiaryCoverage[]> => {
      if (!beneficiaryId || !orgId) return [];

      // Get active enrollments for this beneficiary
      const { data: enrollments } = await supabase
        .from('beneficiary_services')
        .select('program_id, programs:program_id(id, name)')
        .eq('beneficiary_id', beneficiaryId)
        .eq('organization_id', orgId)
        .eq('status', 'active');

      if (!enrollments || enrollments.length === 0) return [];

      const programIds = [...new Set(enrollments.map(e => e.program_id).filter(Boolean))] as string[];

      // Get all projects with sponsorship_required for these programs
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, program_id, estimated_cost, funding_cycle, sponsorship_required')
        .in('program_id', programIds)
        .eq('organization_id', orgId);

      // Get all donor funding for this beneficiary
      const { data: donors } = await supabase
        .from('beneficiary_donors')
        .select('program_id, amount_received')
        .eq('beneficiary_id', beneficiaryId)
        .eq('organization_id', orgId);

      // Also check project-specific funding via financial_transactions
      const { data: projectFunding } = await supabase
        .from('financial_transactions')
        .select('project_id, amount')
        .eq('beneficiary_id', beneficiaryId)
        .eq('organization_id', orgId)
        .eq('transaction_type', 'beneficiary_support')
        .not('project_id', 'is', null);

      const projectFundingMap = new Map<string, number>();
      (projectFunding || []).forEach(f => {
        const existing = projectFundingMap.get(f.project_id!) || 0;
        projectFundingMap.set(f.project_id!, existing + Number(f.amount || 0));
      });

      // Calculate per-program coverage
      const coverages: BeneficiaryCoverage[] = [];

      for (const programId of programIds) {
        const enrollment = enrollments.find(e => e.program_id === programId);
        const programName = (enrollment?.programs as any)?.name || 'Unknown';
        const programProjects = (projects || []).filter(p => p.program_id === programId);
        const sponsorshipProjects = programProjects.filter(p => (p as any).sponsorship_required || (p as any).estimated_cost > 0);

        if (sponsorshipProjects.length === 0) continue;

        // Total required = sum of estimated_cost of all sponsorship projects
        const totalRequired = sponsorshipProjects.reduce((s, p) => s + Number((p as any).estimated_cost || 0), 0);

        // Total received = donor contributions for this program
        const programDonorTotal = (donors || [])
          .filter(d => d.program_id === programId)
          .reduce((s, d) => s + Number(d.amount_received || 0), 0);

        // Plus project-specific funding
        const projectSpecificTotal = sponsorshipProjects.reduce((s, p) => s + (projectFundingMap.get(p.id) || 0), 0);
        const totalReceived = Math.max(programDonorTotal, projectSpecificTotal); // Use whichever is higher to avoid double-count

        const needs: ProjectNeed[] = sponsorshipProjects.map(p => {
          const cost = Number((p as any).estimated_cost || 0);
          const funded = projectFundingMap.get(p.id) || 0;
          // Distribute program-level donor funding proportionally if no project-specific funding
          const proportionalFunding = totalRequired > 0 ? (cost / totalRequired) * programDonorTotal : 0;
          const effectiveFunded = funded > 0 ? funded : proportionalFunding;
          return {
            id: p.id,
            name: p.name,
            estimated_cost: cost,
            funding_cycle: (p as any).funding_cycle || 'annually',
            funded: Math.round(effectiveFunded),
            gap: Math.max(0, cost - effectiveFunded),
            coverage: cost > 0 ? Math.min(100, Math.round((effectiveFunded / cost) * 100)) : 100,
          };
        });

        coverages.push({
          beneficiaryId,
          programId,
          programName,
          totalRequired,
          totalReceived,
          gap: Math.max(0, totalRequired - totalReceived),
          coverage: totalRequired > 0 ? Math.min(100, Math.round((totalReceived / totalRequired) * 100)) : 100,
          status: getStatus(totalReceived, totalRequired),
          needs,
        });
      }

      return coverages;
    },
    enabled: !!beneficiaryId && !!orgId,
  });
}

export function useProgramCoverage(programId: string | undefined) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ['program-coverage', programId, orgId],
    queryFn: async (): Promise<ProgramCoverageSummary | null> => {
      if (!programId || !orgId) return null;

      // Get program name
      const { data: program } = await supabase
        .from('programs')
        .select('id, name')
        .eq('id', programId)
        .single();

      if (!program) return null;

      // Get sponsorship projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, estimated_cost, funding_cycle, sponsorship_required')
        .eq('program_id', programId)
        .eq('organization_id', orgId);

      const sponsorshipProjects = (projects || []).filter(p => (p as any).sponsorship_required || (p as any).estimated_cost > 0);

      // Get enrolled beneficiaries
      const { data: enrollments } = await supabase
        .from('beneficiary_services')
        .select('beneficiary_id, beneficiaries:beneficiary_id(id, display_name)')
        .eq('program_id', programId)
        .eq('organization_id', orgId)
        .eq('status', 'active');

      const beneficiaryIds = [...new Set((enrollments || []).map(e => e.beneficiary_id))];
      const costPerBeneficiary = sponsorshipProjects.reduce((s, p) => s + Number((p as any).estimated_cost || 0), 0);
      const totalRequired = costPerBeneficiary * beneficiaryIds.length;

      // Get all donor funding for these beneficiaries in this program
      const { data: allDonors } = beneficiaryIds.length > 0
        ? await supabase
            .from('beneficiary_donors')
            .select('beneficiary_id, amount_received')
            .eq('program_id', programId)
            .eq('organization_id', orgId)
            .in('beneficiary_id', beneficiaryIds)
        : { data: [] };

      // Group by beneficiary
      const beneficiaryFunding = new Map<string, number>();
      (allDonors || []).forEach(d => {
        const existing = beneficiaryFunding.get(d.beneficiary_id) || 0;
        beneficiaryFunding.set(d.beneficiary_id, existing + Number(d.amount_received || 0));
      });

      let fullyFunded = 0, partiallyFunded = 0, unfunded = 0;
      const opportunities: ProgramCoverageSummary['opportunities'] = [];

      beneficiaryIds.forEach(bid => {
        const received = beneficiaryFunding.get(bid) || 0;
        const status = getStatus(received, costPerBeneficiary);
        if (status === 'fully_funded') fullyFunded++;
        else if (status === 'partially_funded') partiallyFunded++;
        else unfunded++;

        // Generate opportunities for unfunded/partially funded
        if (status !== 'fully_funded' && costPerBeneficiary > 0) {
          const enrollment = (enrollments || []).find(e => e.beneficiary_id === bid);
          const name = (enrollment?.beneficiaries as any)?.display_name || 'Unknown';
          sponsorshipProjects.forEach(p => {
            const cost = Number((p as any).estimated_cost || 0);
            const proportionalReceived = costPerBeneficiary > 0 ? (cost / costPerBeneficiary) * received : 0;
            const needGap = cost - proportionalReceived;
            if (needGap > 0) {
              opportunities.push({
                beneficiaryName: name,
                beneficiaryId: bid,
                projectName: p.name,
                amount: Math.round(needGap),
              });
            }
          });
        }
      });

      const totalReceived = Array.from(beneficiaryFunding.values()).reduce((s, v) => s + v, 0);

      // Project-level gaps
      const projectGaps = sponsorshipProjects.map(p => {
        const cost = Number((p as any).estimated_cost || 0) * beneficiaryIds.length;
        const proportionalReceived = costPerBeneficiary > 0 ? (Number((p as any).estimated_cost || 0) / costPerBeneficiary) * totalReceived : 0;
        return {
          projectName: p.name,
          required: cost,
          received: Math.round(proportionalReceived),
          gap: Math.max(0, Math.round(cost - proportionalReceived)),
        };
      });

      return {
        programId,
        programName: program.name,
        totalBeneficiaries: beneficiaryIds.length,
        fullyFunded,
        partiallyFunded,
        unfunded,
        totalRequired,
        totalReceived,
        gap: Math.max(0, totalRequired - totalReceived),
        coverageRate: totalRequired > 0 ? Math.min(100, Math.round((totalReceived / totalRequired) * 100)) : 100,
        projectGaps,
        opportunities: opportunities.sort((a, b) => b.amount - a.amount).slice(0, 20),
      };
    },
    enabled: !!programId && !!orgId,
  });
}

export function useOrgSponsorshipMetrics() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ['org-sponsorship-metrics', orgId],
    queryFn: async () => {
      if (!orgId) return null;

      // Get all programs with sponsorship projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, program_id, estimated_cost, sponsorship_required')
        .eq('organization_id', orgId);

      const sponsorshipProjects = (projects || []).filter(p => (p as any).sponsorship_required || (p as any).estimated_cost > 0);
      const programIds = [...new Set(sponsorshipProjects.map(p => p.program_id).filter(Boolean))] as string[];

      if (programIds.length === 0) return { totalRequired: 0, totalReceived: 0, gap: 0, coverageRate: 0 };

      // Get enrolled beneficiaries count per program
      const { data: enrollments } = await supabase
        .from('beneficiary_services')
        .select('program_id, beneficiary_id')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .in('program_id', programIds);

      // Calculate total required
      let totalRequired = 0;
      const programBeneficiaryCount = new Map<string, number>();
      (enrollments || []).forEach(e => {
        if (!e.program_id) return;
        const count = programBeneficiaryCount.get(e.program_id) || 0;
        programBeneficiaryCount.set(e.program_id, count + 1);
      });

      programIds.forEach(pid => {
        const programProjects = sponsorshipProjects.filter(p => p.program_id === pid);
        const costPerBeneficiary = programProjects.reduce((s, p) => s + Number((p as any).estimated_cost || 0), 0);
        const beneficiaryCount = programBeneficiaryCount.get(pid) || 0;
        totalRequired += costPerBeneficiary * beneficiaryCount;
      });

      // Get total received
      const beneficiaryIds = [...new Set((enrollments || []).map(e => e.beneficiary_id))];
      let totalReceived = 0;
      if (beneficiaryIds.length > 0) {
        const { data: donors } = await supabase
          .from('beneficiary_donors')
          .select('amount_received')
          .eq('organization_id', orgId)
          .in('beneficiary_id', beneficiaryIds)
          .in('program_id', programIds);

        totalReceived = (donors || []).reduce((s, d) => s + Number(d.amount_received || 0), 0);
      }

      return {
        totalRequired,
        totalReceived,
        gap: Math.max(0, totalRequired - totalReceived),
        coverageRate: totalRequired > 0 ? Math.min(100, Math.round((totalReceived / totalRequired) * 100)) : 0,
      };
    },
    enabled: !!orgId,
  });
}
