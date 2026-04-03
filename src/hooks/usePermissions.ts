import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import { isSuperAdmin } from '@/lib/superAdmin';

export interface RbacRole {
  role_id: string;
  role_name: string;
  display_name: string;
  color: string;
  icon: string;
  is_system_role: boolean;
}

export function usePermissions() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const superAdmin = isSuperAdmin(user?.email);

  // Fetch user's permissions as flat array of "module.action.resource" strings
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['rbac-permissions', user?.id, orgId],
    queryFn: async () => {
      if (!user?.id || !orgId) return [];
      const { data, error } = await supabase.rpc('get_user_permissions', {
        _user_id: user.id,
        _org_id: orgId,
      });
      if (error) {
        console.error('Error fetching permissions:', error);
        return [];
      }
      return (data as string[]) || [];
    },
    enabled: !!user?.id && !!orgId && !superAdmin,
    staleTime: 5 * 60 * 1000, // Cache 5 min
  });

  // Fetch user's RBAC roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['rbac-roles', user?.id, orgId],
    queryFn: async () => {
      if (!user?.id || !orgId) return [];
      const { data, error } = await supabase.rpc('get_user_rbac_roles', {
        _user_id: user.id,
        _org_id: orgId,
      });
      if (error) {
        console.error('Error fetching RBAC roles:', error);
        return [];
      }
      return (data as RbacRole[]) || [];
    },
    enabled: !!user?.id && !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  // Check if user has a specific permission
  const hasPermission = useCallback(
    (module: string, action: string, resource: string): boolean => {
      if (superAdmin) return true;
      const key = `${module}.${action}.${resource}`;
      return permissions.includes(key);
    },
    [permissions, superAdmin]
  );

  // Check if user has ANY permission in a module (for showing/hiding nav items)
  const hasModuleAccess = useCallback(
    (module: string): boolean => {
      if (superAdmin) return true;
      return permissions.some((p: string) => p.startsWith(`${module}.`));
    },
    [permissions, superAdmin]
  );

  // Check if user can perform action on any resource in a module
  const hasActionInModule = useCallback(
    (module: string, action: string): boolean => {
      if (superAdmin) return true;
      return permissions.some((p: string) => p.startsWith(`${module}.${action}.`));
    },
    [permissions, superAdmin]
  );

  // Convenience shortcuts
  const can = useMemo(() => ({
    // Beneficiaries
    viewBeneficiaries: superAdmin || permissions.includes('beneficiaries.view.beneficiaries'),
    createBeneficiaries: superAdmin || permissions.includes('beneficiaries.create.beneficiaries'),
    editBeneficiaries: superAdmin || permissions.includes('beneficiaries.edit.beneficiaries'),
    deleteBeneficiaries: superAdmin || permissions.includes('beneficiaries.delete.beneficiaries'),
    viewMedicalInfo: superAdmin || permissions.includes('beneficiaries.view.medical_info'),
    exportBeneficiaries: superAdmin || permissions.includes('beneficiaries.export.beneficiaries'),

    // Programs
    viewPrograms: superAdmin || permissions.includes('programs.view.programs'),
    createPrograms: superAdmin || permissions.includes('programs.create.programs'),
    editPrograms: superAdmin || permissions.includes('programs.edit.programs'),
    deletePrograms: superAdmin || permissions.includes('programs.delete.programs'),
    manageIndicators: superAdmin || permissions.includes('programs.manage.indicators'),

    // Visitations
    viewVisits: superAdmin || permissions.includes('visitations.view.visits'),
    createVisits: superAdmin || permissions.includes('visitations.create.visits'),

    // Reports
    viewReports: superAdmin || permissions.includes('reports.view.reports'),
    generateReports: superAdmin || permissions.includes('reports.create.reports'),
    exportReports: superAdmin || permissions.includes('reports.export.reports'),
    viewAnalytics: superAdmin || permissions.includes('reports.view.analytics'),

    // Users
    viewUsers: superAdmin || permissions.includes('users.view.users'),
    createUsers: superAdmin || permissions.includes('users.create.users'),
    manageRoles: superAdmin || permissions.includes('users.manage.roles'),
    manageCustomRoles: superAdmin || permissions.includes('users.manage.custom_roles'),

    // Settings
    manageSettings: superAdmin || permissions.includes('settings.manage.org_settings'),

    // Donors
    viewDonors: superAdmin || permissions.includes('donors.view.donors'),
    
    // Attendance
    viewAttendance: superAdmin || permissions.includes('attendance.view.attendance'),

    // Financial
    viewFinancials: superAdmin || permissions.includes('financial.view.financials'),

    // HR
    viewHR: superAdmin || permissions.includes('hr.view.staff'),

    // Communications
    viewCommunications: superAdmin || permissions.includes('communications.view.communications'),

    // Automation
    viewAutomation: superAdmin || permissions.includes('automation.view.automation'),

    // Documents
    viewDocuments: superAdmin || permissions.includes('documents.view.documents'),

    // Compliance
    viewCompliance: superAdmin || permissions.includes('compliance.view.compliance'),

    // Board
    viewBoard: superAdmin || permissions.includes('board.view.reports'),

    // Branches
    viewBranches: superAdmin || permissions.includes('branches.view.branches'),

    // Volunteers
    viewVolunteers: superAdmin || permissions.includes('volunteers.view.volunteers'),

    // Partners
    viewPartners: superAdmin || permissions.includes('partners.view.partners'),

    // Risk
    viewRisk: superAdmin || permissions.includes('risk.view.risk'),

    // M&E
    viewME: superAdmin || permissions.includes('me.view.me'),

    // AI
    viewAI: superAdmin || permissions.includes('ai.view.insights'),

    // Accountability
    viewAccountability: superAdmin || permissions.includes('accountability.view.accountability'),
    manageComplaints: superAdmin || permissions.includes('accountability.manage.complaints'),
    viewSafeguarding: superAdmin || permissions.includes('accountability.view.safeguarding'),
    manageSafeguarding: superAdmin || permissions.includes('accountability.manage.safeguarding'),
  }), [permissions, superAdmin]);

  const isLoading = permissionsLoading || rolesLoading;
  const primaryRole = roles.length > 0 ? roles[0] : null;

  return {
    permissions,
    roles,
    primaryRole,
    hasPermission,
    hasModuleAccess,
    hasActionInModule,
    can,
    isLoading,
    isSuperAdmin: superAdmin,
  };
}
