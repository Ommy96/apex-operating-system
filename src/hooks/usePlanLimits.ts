import { useOrgPlanData } from './useFeatureFlag';

const PLAN_LIMITS: Record<string, { max_beneficiaries: number; max_projects: number; max_users: number; max_programmes: number }> = {
  free: { max_beneficiaries: 100, max_projects: 3, max_users: 5, max_programmes: 2 },
  starter: { max_beneficiaries: 500, max_projects: 5, max_users: 10, max_programmes: 3 },
  professional: { max_beneficiaries: 5000, max_projects: 20, max_users: 25, max_programmes: 10 },
  enterprise: { max_beneficiaries: Infinity, max_projects: Infinity, max_users: Infinity, max_programmes: Infinity },
  partner: { max_beneficiaries: Infinity, max_projects: Infinity, max_users: Infinity, max_programmes: Infinity },
};

export function usePlanLimits() {
  const { planData, isLoading } = useOrgPlanData();

  const isPartner = planData?.is_partner === true;
  const tier = isPartner ? 'partner' : ((planData?.subscription_tier as string) || 'free');
  const limits = PLAN_LIMITS[tier] || PLAN_LIMITS.free;

  return {
    limits,
    isPartner,
    tier,
    isUnlimited: tier === 'partner' || tier === 'enterprise',
    isLoading,
  };
}
