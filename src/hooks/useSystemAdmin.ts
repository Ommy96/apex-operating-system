import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { isSuperAdmin } from '@/lib/superAdmin';

// Types
export interface OrganizationWithSubscription {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  county: string | null;
  organization_type: string | null;
  is_active: boolean;
  subscription_tier: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  features_enabled: Record<string, unknown> | null;
  trial_ends_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  member_count: number;
  beneficiary_count: number;
  program_count: number;
  last_activity: string | null;
  health_score: number;
  risk_level: 'low' | 'medium' | 'high';
}

export interface UserWithDetails {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  organization_id: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  organizations: { name: string; id: string }[];
}

export interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  target_tiers: string[];
  target_organizations: string[];
  created_at: string;
  updated_at: string;
}

export interface SystemStats {
  totalOrganizations: number;
  activeOrganizations: number;
  suspendedOrganizations: number;
  totalUsers: number;
  totalBeneficiaries: number;
  totalPrograms: number;
  totalFinancialTransactions: number;
  revenueByTier: { tier: string; count: number }[];
  onboardingCompleted: number;
  onboardingPending: number;
  trialOrganizations: number;
  monthlyRevenue: number;
  annualRevenue: number;
  orgsByCountry: { country: string; count: number }[];
}

const TIER_PRICING: Record<string, number> = {
  free: 0,
  starter: 29,
  professional: 99,
  enterprise: 299,
};

function computeHealthScore(org: {
  member_count: number;
  beneficiary_count: number;
  program_count: number;
  onboarding_completed: boolean;
  is_active: boolean;
  subscription_status: string | null;
  last_activity: string | null;
}): number {
  let score = 0;
  // Onboarding
  if (org.onboarding_completed) score += 20;
  // Active status
  if (org.is_active && org.subscription_status !== 'suspended') score += 15;
  // Has members
  if (org.member_count > 0) score += 15;
  if (org.member_count >= 3) score += 5;
  // Has beneficiaries
  if (org.beneficiary_count > 0) score += 15;
  if (org.beneficiary_count >= 10) score += 5;
  // Has programs
  if (org.program_count > 0) score += 15;
  // Recent activity (within 30 days)
  if (org.last_activity) {
    const daysSince = (Date.now() - new Date(org.last_activity).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) score += 10;
    else if (daysSince <= 30) score += 5;
  }
  return Math.min(100, score);
}

function computeRiskLevel(org: {
  health_score: number;
  is_active: boolean;
  subscription_status: string | null;
  member_count: number;
}): 'low' | 'medium' | 'high' {
  if (!org.is_active || org.subscription_status === 'suspended') return 'high';
  if (org.subscription_status === 'past_due') return 'high';
  if (org.health_score < 30) return 'high';
  if (org.health_score < 60 || org.member_count === 0) return 'medium';
  return 'low';
}

// Hook for fetching all organizations with enriched data
export function useAllOrganizations() {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.email);

  return useQuery({
    queryKey: ['admin-all-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id, name, slug, email, phone, country, county, organization_type,
          is_active, subscription_tier, subscription_status, stripe_customer_id,
          features_enabled, trial_ends_at, suspended_at, suspended_reason,
          created_at, updated_at, onboarding_completed, onboarding_completed_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const orgsWithCounts = await Promise.all(
        (data || []).map(async (org) => {
          const [membersRes, beneficiariesRes, programsRes, lastActivityRes] = await Promise.all([
            supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
            supabase.from('beneficiaries').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
            supabase.from('programs').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
            supabase.from('audit_logs').select('created_at')
              .in('user_id', (await supabase.from('organization_members').select('user_id').eq('organization_id', org.id)).data?.map(m => m.user_id) || [])
              .order('created_at', { ascending: false })
              .limit(1),
          ]);

          const base = {
            ...org,
            member_count: membersRes.count || 0,
            beneficiary_count: beneficiariesRes.count || 0,
            program_count: programsRes.count || 0,
            last_activity: lastActivityRes.data?.[0]?.created_at || null,
            health_score: 0,
            risk_level: 'low' as 'low' | 'medium' | 'high',
          };
          
          base.health_score = computeHealthScore(base);
          (base as any).risk_level = computeRiskLevel(base);

          return base as OrganizationWithSubscription;
        })
      );

      return orgsWithCounts;
    },
    enabled: isSuperAdminUser,
    refetchInterval: 60000,
  });
}

// Hook for managing organizations
export function useOrganizationManagement() {
  const queryClient = useQueryClient();

  const suspendOrganization = useMutation({
    mutationFn: async ({ orgId, reason }: { orgId: string; reason: string }) => {
      const { error } = await supabase
        .from('organizations')
        .update({
          is_active: false,
          subscription_status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_reason: reason,
        })
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-system-stats'] });
      toast.success('Organization suspended');
    },
    onError: (error) => toast.error(`Failed to suspend: ${error.message}`),
  });

  const activateOrganization = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase
        .from('organizations')
        .update({
          is_active: true,
          subscription_status: 'active',
          suspended_at: null,
          suspended_reason: null,
        })
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-system-stats'] });
      toast.success('Organization activated');
    },
    onError: (error) => toast.error(`Failed to activate: ${error.message}`),
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ orgId, tier, features }: { orgId: string; tier: string; features?: Record<string, unknown> }) => {
      const updateData: Record<string, unknown> = { subscription_tier: tier };
      if (features) updateData.features_enabled = features;
      const { error } = await supabase.from('organizations').update(updateData).eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-system-stats'] });
      toast.success('Subscription updated');
    },
    onError: (error) => toast.error(`Failed to update: ${error.message}`),
  });

  const updateFeatureLimits = useMutation({
    mutationFn: async ({ orgId, features }: { orgId: string; features: Record<string, unknown> }) => {
      const { data: org } = await supabase.from('organizations').select('features_enabled').eq('id', orgId).single();
      const merged = { ...(org?.features_enabled as Record<string, unknown> || {}), ...features } as any;
      const { error } = await supabase.from('organizations').update({ features_enabled: merged }).eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-organizations'] });
      toast.success('Feature limits updated');
    },
    onError: (error) => toast.error(`Failed to update limits: ${error.message}`),
  });

  return { suspendOrganization, activateOrganization, updateSubscription, updateFeatureLimits };
}

// Hook for fetching all users
export function useAllUsers() {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.email);

  return useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, role, organization_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const usersWithOrgs = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: memberships } = await supabase
            .from('organization_members')
            .select('organization_id, organizations:organization_id(id, name)')
            .eq('user_id', profile.user_id);

          return {
            id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
            organization_id: profile.organization_id,
            created_at: profile.created_at,
            last_sign_in_at: null,
            organizations: (memberships || []).map((m) => ({
              id: (m.organizations as any)?.id,
              name: (m.organizations as any)?.name,
            })).filter(o => o.id),
          } as UserWithDetails;
        })
      );

      return usersWithOrgs;
    },
    enabled: isSuperAdminUser,
    refetchInterval: 60000,
  });
}

// Hook for feature flags
export function useFeatureFlags() {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.email);

  return useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feature_flags').select('*').order('flag_name');
      if (error) throw error;
      return data as FeatureFlag[];
    },
    enabled: isSuperAdminUser,
  });
}

export function useFeatureFlagManagement() {
  const queryClient = useQueryClient();

  const toggleFlag = useMutation({
    mutationFn: async ({ flagId, isEnabled }: { flagId: string; isEnabled: boolean }) => {
      const { error } = await supabase.from('feature_flags').update({ is_enabled: isEnabled }).eq('id', flagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success('Feature flag updated');
    },
  });

  const updateRollout = useMutation({
    mutationFn: async ({ flagId, percentage, tiers }: { flagId: string; percentage: number; tiers: string[] }) => {
      const { error } = await supabase.from('feature_flags').update({ rollout_percentage: percentage, target_tiers: tiers }).eq('id', flagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success('Rollout updated');
    },
  });

  return { toggleFlag, updateRollout };
}

// Hook for global audit logs
export function useGlobalAuditLogs(filters?: { orgId?: string; userId?: string; eventType?: string; limit?: number }) {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.email);

  return useQuery({
    queryKey: ['admin-audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.userId) query = query.eq('user_id', filters.userId);
      if (filters?.eventType) query = query.eq('event_type', filters.eventType);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdminUser,
  });
}

// Hook for system statistics - enhanced
export function useSystemStats() {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.email);

  return useQuery({
    queryKey: ['admin-system-stats'],
    queryFn: async () => {
      const [
        orgsRes,
        activeOrgsRes,
        suspendedOrgsRes,
        usersRes,
        beneficiariesRes,
        programsRes,
        financialRes,
        tierStatsRes,
        onboardingCompletedRes,
        trialRes,
        countryRes,
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('organizations').select('*', { count: 'exact', head: true }).not('suspended_at', 'is', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('beneficiaries').select('*', { count: 'exact', head: true }),
        supabase.from('programs').select('*', { count: 'exact', head: true }),
        supabase.from('financial_transactions').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('subscription_tier'),
        supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('onboarding_completed', true),
        supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trial'),
        supabase.from('organizations').select('country'),
      ]);

      const totalOrgs = orgsRes.count || 0;
      const completedOnboarding = onboardingCompletedRes.count || 0;

      const tierCounts: Record<string, number> = {};
      (tierStatsRes.data || []).forEach((org) => {
        const tier = org.subscription_tier || 'free';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      });

      const monthlyRevenue = Object.entries(tierCounts).reduce((sum, [tier, count]) => {
        return sum + (TIER_PRICING[tier] || 0) * count;
      }, 0);

      const countryCounts: Record<string, number> = {};
      (countryRes.data || []).forEach((org) => {
        const c = org.country || 'Unknown';
        countryCounts[c] = (countryCounts[c] || 0) + 1;
      });

      return {
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgsRes.count || 0,
        suspendedOrganizations: suspendedOrgsRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalBeneficiaries: beneficiariesRes.count || 0,
        totalPrograms: programsRes.count || 0,
        totalFinancialTransactions: financialRes.count || 0,
        revenueByTier: Object.entries(tierCounts).map(([tier, count]) => ({ tier, count })),
        onboardingCompleted: completedOnboarding,
        onboardingPending: totalOrgs - completedOnboarding,
        trialOrganizations: trialRes.count || 0,
        monthlyRevenue,
        annualRevenue: monthlyRevenue * 12,
        orgsByCountry: Object.entries(countryCounts).map(([country, count]) => ({ country, count })),
      } as SystemStats;
    },
    enabled: isSuperAdminUser,
    refetchInterval: 30000,
  });
}
