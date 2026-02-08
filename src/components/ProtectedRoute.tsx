import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { isSuperAdmin } from '@/lib/superAdmin';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'admin' | 'management' | 'staff';
  requirePermission?: { module: string; action: string; resource: string };
}

export function ProtectedRoute({ children, requireRole, requirePermission }: ProtectedRouteProps) {
  const { user, loading, userRole } = useAuth();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { hasPermission, isSuperAdmin: superAdmin, isLoading: permLoading } = usePermissions();

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Super admin without org context → redirect to admin area
  if (superAdmin && !currentOrganization) {
    const currentPath = window.location.pathname;
    if (currentPath !== '/admin/infera') {
      return <Navigate to="/admin/infera" replace />;
    }
  }

  // Non-super users without org must onboard
  if (!superAdmin && !currentOrganization && !orgLoading) {
    return <Navigate to="/register-organization" replace />;
  }

  // Super admin bypasses all permission checks
  if (superAdmin) {
    return <>{children}</>;
  }

  // Permission-based access check (new RBAC system)
  if (requirePermission && currentOrganization) {
    // Wait for permissions to load
    if (permLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      );
    }

    const { module, action, resource } = requirePermission;
    if (!hasPermission(module, action, resource)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  // Legacy role-based checks (backward compatibility)
  if (requireRole === 'admin' && userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (requireRole === 'management' && !['admin', 'management'].includes(userRole || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
