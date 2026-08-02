import { logger } from "@/lib/logger";
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
  // Organization-level admin/owner acts as a full-access role within their org,
  // regardless of whether granular RBAC permissions have been assigned. This
  // guarantees founders never end up locked out if RBAC seeding hasn't run.
  const orgRole = currentOrganization?.user_role;
  const orgAdmin = orgRole === 'admin' || orgRole === 'owner' || orgRole === 'org_admin';
  const fullAccess = superAdmin || orgAdmin;

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
        logger.error('Error fetching permissions:', error);
        return [];
      }
      return (data as string[]) || [];
    },
    enabled: !!user?.id && !!orgId && !fullAccess,
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
        logger.error('Error fetching RBAC roles:', error);
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
      if (fullAccess) return true;
      const key = `${module}.${action}.${resource}`;
      return permissions.includes(key);
    },
    [permissions, fullAccess]
  );

  // Check if user has ANY permission in a module (for showing/hiding nav items)
  const hasModuleAccess = useCallback(
    (module: string): boolean => {
      if (fullAccess) return true;
      return permissions.some((p: string) => p.startsWith(`${module}.`));
    },
    [permissions, fullAccess]
  );

  // Check if user can perform action on any resource in a module
  const hasActionInModule = useCallback(
    (module: string, action: string): boolean => {
      if (fullAccess) return true;
      return permissions.some((p: string) => p.startsWith(`${module}.${action}.`));
    },
    [permissions, fullAccess]
  );

  // Convenience shortcuts
  const can = useMemo(() => ({
    // Beneficiaries
    viewBeneficiaries: fullAccess || permissions.includes('beneficiaries.view.beneficiaries'),
    createBeneficiaries: fullAccess || permissions.includes('beneficiaries.create.beneficiaries'),
    editBeneficiaries: fullAccess || permissions.includes('beneficiaries.edit.beneficiaries'),
    deleteBeneficiaries: fullAccess || permissions.includes('beneficiaries.delete.beneficiaries'),
    viewMedicalInfo: fullAccess || permissions.includes('beneficiaries.view.medical_info'),
    exportBeneficiaries: fullAccess || permissions.includes('beneficiaries.export.beneficiaries'),

    // Programs
    viewPrograms: fullAccess || permissions.includes('programs.view.programs'),
    createPrograms: fullAccess || permissions.includes('programs.create.programs'),
    editPrograms: fullAccess || permissions.includes('programs.edit.programs'),
    deletePrograms: fullAccess || permissions.includes('programs.delete.programs'),
    manageIndicators: fullAccess || permissions.includes('programs.manage.indicators'),

    // Visitations
    viewVisits: fullAccess || permissions.includes('visitations.view.visits'),
    createVisits: fullAccess || permissions.includes('visitations.create.visits'),

    // Reports
    viewReports: fullAccess || permissions.includes('reports.view.reports'),
    generateReports: fullAccess || permissions.includes('reports.create.reports'),
    exportReports: fullAccess || permissions.includes('reports.export.reports'),
    viewAnalytics: fullAccess || permissions.includes('reports.view.analytics'),

    // Users
    viewUsers: fullAccess || permissions.includes('users.view.users'),
    createUsers: fullAccess || permissions.includes('users.create.users'),
    manageRoles: fullAccess || permissions.includes('users.manage.roles'),
    manageCustomRoles: fullAccess || permissions.includes('users.manage.custom_roles'),

    // Settings
    manageSettings: fullAccess || permissions.includes('settings.manage.org_settings'),

    // Donors
    viewDonors: fullAccess || permissions.includes('donors.view.donors'),
    
    // Attendance
    viewAttendance: fullAccess || permissions.includes('attendance.view.attendance'),

    // Financial
    viewFinancials: fullAccess || permissions.includes('financial.view.financials'),
    manageFinancials: fullAccess || permissions.includes('financial.manage.financials') || permissions.includes('financial.manage.expense_claims'),
    manageCashTransfers: fullAccess || permissions.includes('financial.manage.cash_transfers'),
    approveCashTransfers: fullAccess || permissions.includes('financial.approve.cash_transfers'),
    manageExpenseClaims: fullAccess || permissions.includes('financial.manage.expense_claims'),
    managePettyCash: fullAccess || permissions.includes('financial.manage.petty_cash'),
    manageProcurement: fullAccess || permissions.includes('financial.manage.procurement'),

    // HR
    viewHR: fullAccess || permissions.includes('hr.view.staff'),
    manageStaff: fullAccess || permissions.includes('users.manage.members') || permissions.includes('users.manage.staff') || permissions.includes('settings.manage.org_settings'),

    // Communications
    viewCommunications: fullAccess || permissions.includes('communications.view.communications'),

    // Automation
    viewAutomation: fullAccess || permissions.includes('automation.view.automation'),

    // Documents
    viewDocuments: fullAccess || permissions.includes('documents.view.documents'),

    // Compliance
    viewCompliance: fullAccess || permissions.includes('compliance.view.compliance'),

    // Board
    viewBoard: fullAccess || permissions.includes('board.view.reports'),

    // Branches
    viewBranches: fullAccess || permissions.includes('branches.view.branches'),

    // Volunteers
    viewVolunteers: fullAccess || permissions.includes('volunteers.view.volunteers'),

    // Partners
    viewPartners: fullAccess || permissions.includes('partners.view.partners'),

    // Risk
    viewRisk: fullAccess || permissions.includes('risk.view.risk'),

    // M&E
    viewME: fullAccess || permissions.includes('me.view.me'),

    // AI
    viewAI: fullAccess || permissions.includes('ai.view.insights'),

    // Accountability
    viewAccountability: fullAccess || permissions.includes('accountability.view.accountability'),
    manageComplaints: fullAccess || permissions.includes('accountability.manage.complaints'),
    viewSafeguarding: fullAccess || permissions.includes('accountability.view.safeguarding'),
    manageSafeguarding: fullAccess || permissions.includes('accountability.manage.safeguarding'),
  }), [permissions, fullAccess]);

  const isLoading = permissionsLoading || rolesLoading;
  const primaryRole = roles.length > 0 ? roles[0] : null;

  // Capture-first field roles: the user holds only field_officer / data_entry
  // roles in this org (and no org-wide elevation). Used to render the reduced,
  // capture-first shell instead of the full management UI.
  const isFieldOfficer =
    !fullAccess &&
    roles.length > 0 &&
    roles.every((r) => r.role_name === 'field_officer' || r.role_name === 'data_entry');

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
    isOrgAdmin: orgAdmin,
    isFieldOfficer,
  };
}
