import { describe, it, expect } from 'vitest';
import {
  PROGRAM_MANAGER_ROLE,
  STAFF_SCOPED_ROLE_NAMES,
  STAFF_PORTAL_PATH,
  isStaffScopedRoleSet,
  isProgramScopedRoleSet,
} from '../rbacRoles';

/**
 * Tests for the shared role constants that mirror the database
 * scoping helpers (user_is_field_scoped / user_is_program_scoped).
 * One test per rule; assertions come from the permission-system brief.
 */

describe('staff-scoped role set', () => {
  it('treats the staff member role as field-scoped, like field officer and data entry', () => {
    expect(STAFF_SCOPED_ROLE_NAMES).toContain('staff_member');
    expect(STAFF_SCOPED_ROLE_NAMES).toContain('field_officer');
    expect(STAFF_SCOPED_ROLE_NAMES).toContain('data_entry');
  });

  it('a user holding only field-scoped roles is scoped to assigned work', () => {
    expect(isStaffScopedRoleSet(['field_officer'])).toBe(true);
    expect(isStaffScopedRoleSet(['staff_member'])).toBe(true);
    expect(isStaffScopedRoleSet(['data_entry', 'staff_member'])).toBe(true);
  });

  it('comparison is case-insensitive so display casing never bypasses scoping', () => {
    expect(isStaffScopedRoleSet(['Field_Officer'])).toBe(true);
  });

  it('any broader role removes the restriction', () => {
    expect(isStaffScopedRoleSet(['field_officer', 'org_admin'])).toBe(false);
    expect(isStaffScopedRoleSet(['program_manager'])).toBe(false);
  });

  it('no active roles means not scoped (existing org members keep their access)', () => {
    expect(isStaffScopedRoleSet([])).toBe(false);
  });
});

describe('program-scoped role set', () => {
  it('a user holding only the program manager role is programme-scoped', () => {
    expect(isProgramScopedRoleSet(['program_manager'])).toBe(true);
    expect(PROGRAM_MANAGER_ROLE).toBe('program_manager');
  });

  it('a combined program + other role is not programme-scoped', () => {
    expect(isProgramScopedRoleSet(['program_manager', 'me_officer'])).toBe(false);
    expect(isProgramScopedRoleSet([])).toBe(false);
  });
});

describe('staff portal', () => {
  it('lives at /workspace so field staff never land in the admin shell', () => {
    expect(STAFF_PORTAL_PATH).toBe('/workspace');
  });
});
