import { describe, it, expect } from 'vitest';

/**
 * Unit tests for permission logic — tests the pure functions
 * without requiring React context or Supabase calls.
 */

// Replicate the permission check logic from usePermissions
function hasPermission(
  permissions: string[],
  superAdmin: boolean,
  module: string,
  action: string,
  resource: string
): boolean {
  if (superAdmin) return true;
  const key = `${module}.${action}.${resource}`;
  return permissions.includes(key);
}

function hasModuleAccess(
  permissions: string[],
  superAdmin: boolean,
  module: string
): boolean {
  if (superAdmin) return true;
  return permissions.some((p) => p.startsWith(`${module}.`));
}

function hasActionInModule(
  permissions: string[],
  superAdmin: boolean,
  module: string,
  action: string
): boolean {
  if (superAdmin) return true;
  return permissions.some((p) => p.startsWith(`${module}.${action}.`));
}

// Replicate the `can` builder logic
function buildCan(permissions: string[], superAdmin: boolean) {
  return {
    viewBeneficiaries: superAdmin || permissions.includes('beneficiaries.view.beneficiaries'),
    createBeneficiaries: superAdmin || permissions.includes('beneficiaries.create.beneficiaries'),
    editBeneficiaries: superAdmin || permissions.includes('beneficiaries.edit.beneficiaries'),
    deleteBeneficiaries: superAdmin || permissions.includes('beneficiaries.delete.beneficiaries'),
    viewMedicalInfo: superAdmin || permissions.includes('beneficiaries.view.medical_info'),
    exportBeneficiaries: superAdmin || permissions.includes('beneficiaries.export.beneficiaries'),
    viewPrograms: superAdmin || permissions.includes('programs.view.programs'),
    viewFinancials: superAdmin || permissions.includes('financial.view.financials'),
    viewHR: superAdmin || permissions.includes('hr.view.staff'),
    manageSettings: superAdmin || permissions.includes('settings.manage.org_settings'),
    viewDonors: superAdmin || permissions.includes('donors.view.donors'),
  };
}

describe('Permission check logic', () => {
  const orgAdminPerms = [
    'beneficiaries.view.beneficiaries',
    'beneficiaries.create.beneficiaries',
    'beneficiaries.edit.beneficiaries',
    'beneficiaries.delete.beneficiaries',
    'beneficiaries.view.medical_info',
    'beneficiaries.export.beneficiaries',
    'programs.view.programs',
    'programs.create.programs',
    'financial.view.financials',
    'hr.view.staff',
    'settings.manage.org_settings',
    'donors.view.donors',
  ];

  const fieldOfficerPerms = [
    'beneficiaries.view.beneficiaries',
    'beneficiaries.create.beneficiaries',
    'visitations.view.visits',
    'visitations.create.visits',
  ];

  describe('hasPermission', () => {
    it('super admin always has permission', () => {
      expect(hasPermission([], true, 'beneficiaries', 'delete', 'beneficiaries')).toBe(true);
      expect(hasPermission([], true, 'settings', 'manage', 'org_settings')).toBe(true);
    });

    it('returns true for granted permissions', () => {
      expect(hasPermission(orgAdminPerms, false, 'beneficiaries', 'view', 'beneficiaries')).toBe(true);
      expect(hasPermission(orgAdminPerms, false, 'financial', 'view', 'financials')).toBe(true);
    });

    it('returns false for non-granted permissions', () => {
      expect(hasPermission(fieldOfficerPerms, false, 'financial', 'view', 'financials')).toBe(false);
      expect(hasPermission(fieldOfficerPerms, false, 'settings', 'manage', 'org_settings')).toBe(false);
    });

    it('returns false for empty permissions', () => {
      expect(hasPermission([], false, 'beneficiaries', 'view', 'beneficiaries')).toBe(false);
    });
  });

  describe('hasModuleAccess', () => {
    it('super admin always has module access', () => {
      expect(hasModuleAccess([], true, 'financial')).toBe(true);
    });

    it('detects module access from any permission in that module', () => {
      expect(hasModuleAccess(fieldOfficerPerms, false, 'beneficiaries')).toBe(true);
      expect(hasModuleAccess(fieldOfficerPerms, false, 'visitations')).toBe(true);
    });

    it('returns false for modules with no permissions', () => {
      expect(hasModuleAccess(fieldOfficerPerms, false, 'financial')).toBe(false);
      expect(hasModuleAccess(fieldOfficerPerms, false, 'hr')).toBe(false);
    });
  });

  describe('hasActionInModule', () => {
    it('super admin always has action access', () => {
      expect(hasActionInModule([], true, 'beneficiaries', 'delete')).toBe(true);
    });

    it('detects specific actions within a module', () => {
      expect(hasActionInModule(fieldOfficerPerms, false, 'beneficiaries', 'view')).toBe(true);
      expect(hasActionInModule(fieldOfficerPerms, false, 'beneficiaries', 'create')).toBe(true);
    });

    it('returns false for actions not granted', () => {
      expect(hasActionInModule(fieldOfficerPerms, false, 'beneficiaries', 'delete')).toBe(false);
      expect(hasActionInModule(fieldOfficerPerms, false, 'beneficiaries', 'export')).toBe(false);
    });
  });

  describe('can shortcuts (buildCan)', () => {
    it('super admin has all capabilities', () => {
      const can = buildCan([], true);
      expect(can.viewBeneficiaries).toBe(true);
      expect(can.deleteBeneficiaries).toBe(true);
      expect(can.viewFinancials).toBe(true);
      expect(can.manageSettings).toBe(true);
    });

    it('org admin can has correct capabilities', () => {
      const can = buildCan(orgAdminPerms, false);
      expect(can.viewBeneficiaries).toBe(true);
      expect(can.createBeneficiaries).toBe(true);
      expect(can.editBeneficiaries).toBe(true);
      expect(can.deleteBeneficiaries).toBe(true);
      expect(can.viewMedicalInfo).toBe(true);
      expect(can.viewFinancials).toBe(true);
      expect(can.viewHR).toBe(true);
      expect(can.manageSettings).toBe(true);
      expect(can.viewDonors).toBe(true);
    });

    it('field officer has limited capabilities', () => {
      const can = buildCan(fieldOfficerPerms, false);
      expect(can.viewBeneficiaries).toBe(true);
      expect(can.createBeneficiaries).toBe(true);
      expect(can.editBeneficiaries).toBe(false);
      expect(can.deleteBeneficiaries).toBe(false);
      expect(can.viewMedicalInfo).toBe(false);
      expect(can.viewFinancials).toBe(false);
      expect(can.viewHR).toBe(false);
      expect(can.manageSettings).toBe(false);
    });

    it('empty permissions yield no capabilities', () => {
      const can = buildCan([], false);
      expect(can.viewBeneficiaries).toBe(false);
      expect(can.viewPrograms).toBe(false);
      expect(can.viewFinancials).toBe(false);
    });
  });
});

describe('Role hierarchy logic', () => {
  // Replicate getRoleLevel from useAuth
  function getRoleLevel(role: string) {
    switch (role) {
      case 'staff': return 1;
      case 'management': return 2;
      case 'admin': return 3;
      default: return 0;
    }
  }

  it('admin is highest level', () => {
    expect(getRoleLevel('admin')).toBeGreaterThan(getRoleLevel('management'));
    expect(getRoleLevel('management')).toBeGreaterThan(getRoleLevel('staff'));
  });

  it('unknown roles get level 0', () => {
    expect(getRoleLevel('unknown')).toBe(0);
    expect(getRoleLevel('')).toBe(0);
  });

  it('detects significant privilege changes (gap > 1)', () => {
    const from = getRoleLevel('staff');
    const to = getRoleLevel('admin');
    expect(Math.abs(to - from)).toBeGreaterThan(1);
  });

  it('detects minor privilege changes (gap <= 1)', () => {
    const from = getRoleLevel('management');
    const to = getRoleLevel('admin');
    expect(Math.abs(to - from)).toBeLessThanOrEqual(1);
  });

  // isAdmin / isManagement derivation
  it('correctly derives isAdmin and isManagement', () => {
    const testRole = (role: string) => {
      const isAdmin = role === 'admin';
      const isManagement = role === 'management' || isAdmin;
      const isStaff = role === 'staff';
      return { isAdmin, isManagement, isStaff };
    };

    expect(testRole('admin')).toEqual({ isAdmin: true, isManagement: true, isStaff: false });
    expect(testRole('management')).toEqual({ isAdmin: false, isManagement: true, isStaff: false });
    expect(testRole('staff')).toEqual({ isAdmin: false, isManagement: false, isStaff: true });
  });
});
