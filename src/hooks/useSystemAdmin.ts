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
  is_active: boolean;
  subscription_tier: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  features_enabled: Record<string, unknown> | null;
  trial_ends_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  member_count?: number;
  beneficiary_count?: number;
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

export interface SupportTicket {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  subject: string;
  description: string;
  priority: string;
  status: string;
  category: string | null;
  assigned_to: string | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  organization?: { name: string } | null;
  user?: { email: string; full_name: string | null } | null;
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

export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  type: string;
  target_audience: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SystemStats {
  totalOrganizations: number;
  activeOrganizations: number;
  suspendedOrganizations: number;
  totalUsers: number;
  totalBeneficiaries: number;
  openTickets: number;
  revenueByTier: { tier: string; count: number }[];
}

// Hook for fetching all organizations with subscription details
export function useAllOrganizations() {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.email);

  return useQuery({
    queryKey: ['admin-all-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id, name, slug, email, phone, is_active,
          subscription_tier, subscription_status, stripe_customer_id,
          features_enabled, trial_ends_at, suspended_at, suspended_reason,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member and beneficiary counts for each org
      const orgsWithCounts = await Promise.all(
        (data || []).map(async (org) => {
          const [membersRes, childrenRes, feedingRes, kipawaRes, empowermentRes] = await Promise.all([
            supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
            supabase.from('children').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
            supabase.from('feeding_program').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
            supabase.from('kipawa_sato').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
            supabase.from('self_empowerment').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
          ]);

          return {
            ...org,
            member_count: membersRes.count || 0,
            beneficiary_count: (childrenRes.count || 0) + (feedingRes.count || 0) + 
                              (kipawaRes.count || 0) + (empowermentRes.count || 0),
          } as OrganizationWithSubscription;
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
      toast.success('Organization suspended');
    },
    onError: (error) => {
      toast.error(`Failed to suspend: ${error.message}`);
    },
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
      toast.success('Organization activated');
    },
    onError: (error) => {
      toast.error(`Failed to activate: ${error.message}`);
    },
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ 
      orgId, 
      tier, 
      features 
    }: { 
      orgId: string; 
      tier: string; 
      features?: Record<string, unknown>;
    }) => {
      const updateData: Record<string, unknown> = { subscription_tier: tier };
      if (features) {
        updateData.features_enabled = features;
      }

      const { error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-organizations'] });
      toast.success('Subscription updated');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  return { suspendOrganization, activateOrganization, updateSubscription };
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
        .select(`
          user_id, email, full_name, role, organization_id, created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get organization memberships for each user
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

// Hook for support tickets
export function useSupportTickets() {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.email);

  return useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          organizations:organization_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user details separately
      const ticketsWithUsers = await Promise.all(
        (data || []).map(async (ticket) => {
          let userData = null;
          if (ticket.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', ticket.user_id)
              .single();
            userData = profile;
          }

          return {
            ...ticket,
            organization: ticket.organizations as { name: string } | null,
            user: userData as { email: string; full_name: string | null } | null,
          };
        })
      );

      return ticketsWithUsers as SupportTicket[];
    },
    enabled: isSuperAdminUser,
  });
}

export function useTicketManagement() {
  const queryClient = useQueryClient();

  const updateTicketStatus = useMutation({
    mutationFn: async ({ ticketId, status, resolution }: { ticketId: string; status: string; resolution?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
        if (resolution) updateData.resolution = resolution;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      toast.success('Ticket updated');
    },
  });

  return { updateTicketStatus };
}

// Hook for feature flags
export function useFeatureFlags() {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.email);

  return useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('flag_name');

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
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: isEnabled })
        .eq('id', flagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success('Feature flag updated');
    },
  });

  const updateRollout = useMutation({
    mutationFn: async ({ flagId, percentage, tiers }: { flagId: string; percentage: number; tiers: string[] }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({ rollout_percentage: percentage, target_tiers: tiers })
        .eq('id', flagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success('Rollout updated');
    },
  });

  return { toggleFlag, updateRollout };
}

// Hook for platform announcements
export function usePlatformAnnouncements() {
  const { user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user?.email);

  return useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PlatformAnnouncement[];
    },
    enabled: isSuperAdminUser,
  });
}

export function useAnnouncementManagement() {
  const queryClient = useQueryClient();

  const createAnnouncement = useMutation({
    mutationFn: async (announcement: Omit<PlatformAnnouncement, 'id' | 'created_at'>) => {
      const { error } = await supabase
        .from('platform_announcements')
        .insert(announcement);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Announcement created');
    },
  });

  const toggleAnnouncement = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('platform_announcements')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Announcement updated');
    },
  });

  return { createAnnouncement, toggleAnnouncement };
}

// Hook for system statistics
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
        childrenRes,
        feedingRes,
        kipawaRes,
        empowermentRes,
        ticketsRes,
        tierStatsRes,
      ] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('organizations').select('*', { count: 'exact', head: true }).not('suspended_at', 'is', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('children').select('*', { count: 'exact', head: true }),
        supabase.from('feeding_program').select('*', { count: 'exact', head: true }),
        supabase.from('kipawa_sato').select('*', { count: 'exact', head: true }),
        supabase.from('self_empowerment').select('*', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase.from('organizations').select('subscription_tier'),
      ]);

      // Calculate tier distribution
      const tierCounts: Record<string, number> = {};
      (tierStatsRes.data || []).forEach((org) => {
        const tier = org.subscription_tier || 'free';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      });

      return {
        totalOrganizations: orgsRes.count || 0,
        activeOrganizations: activeOrgsRes.count || 0,
        suspendedOrganizations: suspendedOrgsRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalBeneficiaries: (childrenRes.count || 0) + (feedingRes.count || 0) + 
                          (kipawaRes.count || 0) + (empowermentRes.count || 0),
        openTickets: ticketsRes.count || 0,
        revenueByTier: Object.entries(tierCounts).map(([tier, count]) => ({ tier, count })),
      } as SystemStats;
    },
    enabled: isSuperAdminUser,
    refetchInterval: 30000,
  });
}
