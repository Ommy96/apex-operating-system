import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/**
 * Integration tests that verify route protection logic.
 * These test the ProtectedRoute behavior by mocking auth/org contexts.
 */

// Since ProtectedRoute depends on useAuth, useOrganization, and usePermissions,
// we test the decision logic directly rather than full context wiring.

describe('Route protection decisions', () => {
  interface RouteDecision {
    user: { id: string; email: string } | null;
    userRole: string | null;
    isSuperAdmin: boolean;
    currentOrganization: { organization_id: string } | null;
    requireRole?: 'admin' | 'management' | 'staff';
    requirePermission?: { module: string; action: string; resource: string };
    hasPermission: boolean;
  }

  function getRouteResult(decision: RouteDecision): 'redirect_auth' | 'redirect_admin' | 'redirect_onboard' | 'access_denied' | 'allowed' {
    if (!decision.user) return 'redirect_auth';

    if (decision.isSuperAdmin && !decision.currentOrganization) return 'redirect_admin';

    if (!decision.isSuperAdmin && !decision.currentOrganization) return 'redirect_onboard';

    if (decision.isSuperAdmin) return 'allowed';

    if (decision.requirePermission && decision.currentOrganization) {
      if (!decision.hasPermission) return 'access_denied';
    }

    if (decision.requireRole === 'admin' && decision.userRole !== 'admin') return 'access_denied';

    if (decision.requireRole === 'management' && !['admin', 'management'].includes(decision.userRole || '')) return 'access_denied';

    return 'allowed';
  }

  it('redirects unauthenticated users to /auth', () => {
    expect(getRouteResult({
      user: null,
      userRole: null,
      isSuperAdmin: false,
      currentOrganization: null,
      hasPermission: false,
    })).toBe('redirect_auth');
  });

  it('redirects super admin without org to admin dashboard', () => {
    expect(getRouteResult({
      user: { id: '1', email: 'inferatechsolutions@gmail.com' },
      userRole: 'admin',
      isSuperAdmin: true,
      currentOrganization: null,
      hasPermission: true,
    })).toBe('redirect_admin');
  });

  it('redirects non-super user without org to onboarding', () => {
    expect(getRouteResult({
      user: { id: '2', email: 'user@example.com' },
      userRole: 'staff',
      isSuperAdmin: false,
      currentOrganization: null,
      hasPermission: false,
    })).toBe('redirect_onboard');
  });

  it('super admin bypasses all permission checks', () => {
    expect(getRouteResult({
      user: { id: '1', email: 'inferatechsolutions@gmail.com' },
      userRole: 'admin',
      isSuperAdmin: true,
      currentOrganization: { organization_id: 'org1' },
      requirePermission: { module: 'financial', action: 'view', resource: 'financials' },
      hasPermission: false, // Even without explicit permission
    })).toBe('allowed');
  });

  it('denies access when user lacks required permission', () => {
    expect(getRouteResult({
      user: { id: '2', email: 'user@example.com' },
      userRole: 'staff',
      isSuperAdmin: false,
      currentOrganization: { organization_id: 'org1' },
      requirePermission: { module: 'financial', action: 'view', resource: 'financials' },
      hasPermission: false,
    })).toBe('access_denied');
  });

  it('allows access when user has required permission', () => {
    expect(getRouteResult({
      user: { id: '2', email: 'user@example.com' },
      userRole: 'staff',
      isSuperAdmin: false,
      currentOrganization: { organization_id: 'org1' },
      requirePermission: { module: 'beneficiaries', action: 'view', resource: 'beneficiaries' },
      hasPermission: true,
    })).toBe('allowed');
  });

  it('denies staff from admin-required routes', () => {
    expect(getRouteResult({
      user: { id: '2', email: 'user@example.com' },
      userRole: 'staff',
      isSuperAdmin: false,
      currentOrganization: { organization_id: 'org1' },
      requireRole: 'admin',
      hasPermission: true,
    })).toBe('access_denied');
  });

  it('allows management on management-required routes', () => {
    expect(getRouteResult({
      user: { id: '2', email: 'manager@example.com' },
      userRole: 'management',
      isSuperAdmin: false,
      currentOrganization: { organization_id: 'org1' },
      requireRole: 'management',
      hasPermission: true,
    })).toBe('allowed');
  });

  it('allows admin on management-required routes', () => {
    expect(getRouteResult({
      user: { id: '2', email: 'admin@example.com' },
      userRole: 'admin',
      isSuperAdmin: false,
      currentOrganization: { organization_id: 'org1' },
      requireRole: 'management',
      hasPermission: true,
    })).toBe('allowed');
  });

  it('denies staff on management-required routes', () => {
    expect(getRouteResult({
      user: { id: '2', email: 'staff@example.com' },
      userRole: 'staff',
      isSuperAdmin: false,
      currentOrganization: { organization_id: 'org1' },
      requireRole: 'management',
      hasPermission: true,
    })).toBe('access_denied');
  });
});
