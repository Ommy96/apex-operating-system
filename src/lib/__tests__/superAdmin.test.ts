import { describe, it, expect } from 'vitest';
import { isSuperAdmin, SUPER_ADMIN_EMAIL } from '@/lib/superAdmin';

describe('isSuperAdmin', () => {
  it('returns true for the configured super admin email', () => {
    expect(isSuperAdmin(SUPER_ADMIN_EMAIL)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isSuperAdmin('INFERATECHSOLUTIONS@GMAIL.COM')).toBe(true);
    expect(isSuperAdmin('InferaTechSolutions@Gmail.Com')).toBe(true);
  });

  it('returns false for any other email', () => {
    expect(isSuperAdmin('user@example.com')).toBe(false);
    expect(isSuperAdmin('admin@company.org')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isSuperAdmin(null)).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSuperAdmin('')).toBe(false);
  });
});
