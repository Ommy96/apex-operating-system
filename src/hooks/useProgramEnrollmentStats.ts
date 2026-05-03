import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { startOfMonth, subMonths, format } from 'date-fns';

export interface ProgramStat {
  programId: string;
  programName: string;
  count: number;
  color?: string;
}

export interface ProgramTrendPoint {
  month: string;
  [programName: string]: string | number; // dynamic program keys
}

const PROGRAM_COLORS = [
  'hsl(221, 83%, 53%)',   // Blue
  'hsl(142, 71%, 45%)',   // Green
  'hsl(24, 95%, 53%)',    // Orange
  'hsl(262, 83%, 58%)',   // Purple
  'hsl(340, 75%, 55%)',   // Pink
  'hsl(190, 80%, 45%)',   // Teal
  'hsl(45, 90%, 50%)',    // Gold
  'hsl(0, 70%, 55%)',     // Red
];

export function useProgramEnrollmentStats() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organization_id;

  // Fetch programs list
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-list', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch enrollment counts per program from beneficiary_services
  const { data: programStats = [], isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['program-enrollment-stats', organizationId],
    queryFn: async (): Promise<ProgramStat[]> => {
      if (!organizationId || programs.length === 0) return [];

      // Get all active enrollments grouped by program_id
      const { data, error } = await supabase
        .from('beneficiary_services')
        .select('program_id')
        .eq('organization_id', organizationId)
        .in('status', ['active', 'Active']);

      if (error) throw error;

      // Count per program
      const countMap = new Map<string, number>();
      (data || []).forEach((row) => {
        if (row.program_id) {
          countMap.set(row.program_id, (countMap.get(row.program_id) || 0) + 1);
        }
      });

      return programs.map((p, idx) => ({
        programId: p.id,
        programName: p.name,
        count: countMap.get(p.id) || 0,
        color: PROGRAM_COLORS[idx % PROGRAM_COLORS.length],
      }));
    },
    enabled: !!organizationId && programs.length > 0,
    refetchInterval: 30000,
  });

  // Fetch total active beneficiaries (unique across all programs)
  const { data: totalBeneficiaries = 0 } = useQuery({
    queryKey: ['total-active-beneficiaries', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;
      const { count, error } = await supabase
        .from('beneficiaries')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .is('deleted_at', null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizationId,
    refetchInterval: 30000,
  });

  // Fetch enrollment trends (6 months)
  const { data: trendData = [], isLoading: trendsLoading } = useQuery({
    queryKey: ['program-enrollment-trends', organizationId],
    queryFn: async (): Promise<ProgramTrendPoint[]> => {
      if (!organizationId || programs.length === 0) return [];

      const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
      const startDateIso = months[0].toISOString();

      const { data, error } = await supabase
        .from('beneficiary_services')
        .select('program_id, enrolled_date')
        .eq('organization_id', organizationId)
        .gte('enrolled_date', format(months[0], 'yyyy-MM-dd'));

      if (error) throw error;

      // Build program name lookup
      const programNameMap = new Map(programs.map(p => [p.id, p.name]));
      const monthLabels = months.map(d => format(d, 'MMM'));

      // Count enrollments per program per month
      const counts: Record<string, number[]> = {};
      programs.forEach(p => { counts[p.name] = new Array(6).fill(0); });

      (data || []).forEach(row => {
        if (!row.program_id || !row.enrolled_date) return;
        const name = programNameMap.get(row.program_id);
        if (!name || !counts[name]) return;
        const rowMonth = format(new Date(row.enrolled_date), 'MMM');
        const idx = monthLabels.indexOf(rowMonth);
        if (idx >= 0) counts[name][idx]++;
      });

      return monthLabels.map((month, i) => {
        const point: ProgramTrendPoint = { month };
        programs.forEach(p => {
          point[p.name] = counts[p.name]?.[i] || 0;
        });
        return point;
      });
    },
    enabled: !!organizationId && programs.length > 0,
    refetchInterval: 30000,
  });

  return {
    programs,
    programStats,
    totalBeneficiaries,
    trendData,
    statsLoading,
    trendsLoading,
    refetch,
    colors: PROGRAM_COLORS,
  };
}
