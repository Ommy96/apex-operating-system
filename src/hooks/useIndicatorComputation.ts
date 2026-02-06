import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

interface ComputedIndicatorValue {
  indicatorId: string;
  value: number;
  computedAt: Date;
  dataSource: string;
}

interface IndicatorComputationConfig {
  type: 'count' | 'sum' | 'average' | 'percentage' | 'ratio';
  table: string;
  field?: string;
  filters?: Record<string, any>;
  numeratorTable?: string;
  denominatorTable?: string;
  numeratorFilters?: Record<string, any>;
  denominatorFilters?: Record<string, any>;
}

/**
 * Hook for auto-computing indicator values from live database data
 */
export function useIndicatorComputation(programId?: string, projectId?: string) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ['indicator-computation', orgId, programId, projectId],
    queryFn: async () => {
      if (!orgId) return [];

      const computedValues: ComputedIndicatorValue[] = [];

      // 1. Count total beneficiaries
      let beneficiaryQuery = supabase
        .from('beneficiaries')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgId)
        .eq('status', 'active');
      const { count: totalBeneficiaries } = await beneficiaryQuery;

      computedValues.push({
        indicatorId: 'total_beneficiaries',
        value: totalBeneficiaries || 0,
        computedAt: new Date(),
        dataSource: 'beneficiaries',
      });

      // 2. Count beneficiaries by type
      const beneficiaryTypes = ['student', 'adult', 'group'];
      for (const type of beneficiaryTypes) {
        const { count } = await supabase
          .from('beneficiaries')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgId)
          .eq('beneficiary_type', type)
          .eq('status', 'active');
        
        computedValues.push({
          indicatorId: `beneficiaries_${type}`,
          value: count || 0,
          computedAt: new Date(),
          dataSource: 'beneficiaries',
        });
      }

      // 3. Count program enrollments
      let enrollmentQuery = supabase
        .from('beneficiary_services')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgId)
        .eq('status', 'Active');
      
      if (programId) {
        enrollmentQuery = enrollmentQuery.eq('program_id', programId);
      }
      if (projectId) {
        enrollmentQuery = enrollmentQuery.eq('project_id', projectId);
      }
      
      const { count: activeEnrollments } = await enrollmentQuery;
      computedValues.push({
        indicatorId: 'active_enrollments',
        value: activeEnrollments || 0,
        computedAt: new Date(),
        dataSource: 'beneficiary_services',
      });

      // 4. Count observations by status
      const observationStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      for (const status of observationStatuses) {
        let obsQuery = supabase
          .from('program_observations')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgId)
          .eq('status', status);
        
        if (programId) {
          obsQuery = obsQuery.eq('program_id', programId);
        }
        
        const { count } = await obsQuery;
        computedValues.push({
          indicatorId: `observations_${status}`,
          value: count || 0,
          computedAt: new Date(),
          dataSource: 'program_observations',
        });
      }

      // 5. Count pending follow-ups (observations with follow_up_date in past or today)
      const today = new Date().toISOString().split('T')[0];
      let followUpQuery = supabase
        .from('program_observations')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgId)
        .neq('status', 'resolved')
        .neq('status', 'closed')
        .lte('follow_up_date', today);
      
      if (programId) {
        followUpQuery = followUpQuery.eq('program_id', programId);
      }
      
      const { count: pendingFollowUps } = await followUpQuery;
      computedValues.push({
        indicatorId: 'pending_follow_ups',
        value: pendingFollowUps || 0,
        computedAt: new Date(),
        dataSource: 'program_observations',
      });

      // 6. Count by gender (for beneficiaries)
      const genders = ['Male', 'Female'];
      for (const gender of genders) {
        const { count } = await supabase
          .from('beneficiaries')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgId)
          .eq('gender', gender)
          .eq('status', 'active');
        
        computedValues.push({
          indicatorId: `beneficiaries_${gender.toLowerCase()}`,
          value: count || 0,
          computedAt: new Date(),
          dataSource: 'beneficiaries',
        });
      }

      // 7. Calculate gender percentage
      const maleCount = computedValues.find(v => v.indicatorId === 'beneficiaries_male')?.value || 0;
      const femaleCount = computedValues.find(v => v.indicatorId === 'beneficiaries_female')?.value || 0;
      const total = maleCount + femaleCount;
      
      if (total > 0) {
        computedValues.push({
          indicatorId: 'female_percentage',
          value: Math.round((femaleCount / total) * 100),
          computedAt: new Date(),
          dataSource: 'computed',
        });
      }

      // 8. Count visitations this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: visitationsThisMonth } = await supabase
        .from('beneficiary_visitations')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgId)
        .gte('visit_date', startOfMonth.toISOString());
      
      computedValues.push({
        indicatorId: 'visitations_this_month',
        value: visitationsThisMonth || 0,
        computedAt: new Date(),
        dataSource: 'beneficiary_visitations',
      });

      return computedValues;
    },
    enabled: !!orgId,
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

/**
 * Hook to get computed value for a specific indicator
 */
export function useComputedIndicatorValue(indicatorId: string, programId?: string, projectId?: string) {
  const { data: allValues, isLoading } = useIndicatorComputation(programId, projectId);
  
  const value = allValues?.find(v => v.indicatorId === indicatorId);
  
  return {
    value: value?.value,
    computedAt: value?.computedAt,
    dataSource: value?.dataSource,
    isLoading,
  };
}

/**
 * Get all available computed indicators with their current values
 */
export function useAvailableComputedIndicators(programId?: string, projectId?: string) {
  const { data: values, isLoading } = useIndicatorComputation(programId, projectId);
  
  const indicatorDefinitions = [
    { id: 'total_beneficiaries', name: 'Total Active Beneficiaries', unit: 'number', category: 'Beneficiaries' },
    { id: 'beneficiaries_student', name: 'Student Beneficiaries', unit: 'number', category: 'Beneficiaries' },
    { id: 'beneficiaries_adult', name: 'Adult Beneficiaries', unit: 'number', category: 'Beneficiaries' },
    { id: 'beneficiaries_group', name: 'Group Beneficiaries', unit: 'number', category: 'Beneficiaries' },
    { id: 'beneficiaries_male', name: 'Male Beneficiaries', unit: 'number', category: 'Demographics' },
    { id: 'beneficiaries_female', name: 'Female Beneficiaries', unit: 'number', category: 'Demographics' },
    { id: 'female_percentage', name: 'Female Percentage', unit: 'percentage', category: 'Demographics' },
    { id: 'active_enrollments', name: 'Active Program Enrollments', unit: 'number', category: 'Programs' },
    { id: 'observations_open', name: 'Open Observations', unit: 'number', category: 'Observations' },
    { id: 'observations_in_progress', name: 'In Progress Observations', unit: 'number', category: 'Observations' },
    { id: 'observations_resolved', name: 'Resolved Observations', unit: 'number', category: 'Observations' },
    { id: 'pending_follow_ups', name: 'Pending Follow-ups', unit: 'number', category: 'Observations' },
    { id: 'visitations_this_month', name: 'Visitations This Month', unit: 'number', category: 'Field Work' },
  ];

  const enrichedIndicators = indicatorDefinitions.map(def => ({
    ...def,
    currentValue: values?.find(v => v.indicatorId === def.id)?.value ?? null,
    computedAt: values?.find(v => v.indicatorId === def.id)?.computedAt,
  }));

  return {
    indicators: enrichedIndicators,
    isLoading,
  };
}
