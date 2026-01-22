import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { isSuperAdmin } from '@/lib/superAdmin';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'admin' | 'management' | 'staff';
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, loading, userRole } = useAuth();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const superAdmin = isSuperAdmin(user?.email);

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

  // Super admin is a platform-level actor and may not belong to any org.
  // If no org context is selected, keep them on the system admin area rather
  // than rendering org-scoped pages that expect an organization_id.
  if (superAdmin && !currentOrganization) {
    const currentPath = window.location.pathname;
    if (currentPath !== '/admin/infera') {
      return <Navigate to="/admin/infera" replace />;
    }
  }

  // If we removed the default org assignment, users may not have an org yet.
  // Super admin can still proceed (they can switch into orgs), others must onboard.
  if (!superAdmin && !currentOrganization) {
    return <Navigate to="/register-organization" replace />;
  }

  // Super admin bypasses org-role checks (their platform access is based on email).
  if (superAdmin) {
    return <>{children}</>;
  }

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

  // Block staff from accessing reports-analytics and settings pages
  if (userRole === 'staff') {
    const restrictedPaths = ['/reports-analytics', '/settings'];
    const currentPath = window.location.pathname;
    
    if (restrictedPaths.includes(currentPath)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}