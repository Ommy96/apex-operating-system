import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

// Routes that should NOT bounce to the wizard even if setup is incomplete.
const EXEMPT_PREFIXES = [
  '/setup/wizard',
  '/setup-2fa',
  '/organization-settings',
  '/super-admin',
  '/admin/infera',
  '/auth',
  '/register-organization',
  '/reset-password',
  '/donor',
  '/board-portal',
  '/stakeholder',
  '/feedback',
  '/report',
];

export function SetupGate({ children }: { children: ReactNode }) {
  const { currentOrganization, isLoading } = useOrganization();
  const location = useLocation();
  const orgId = currentOrganization?.organization_id;
  const role = currentOrganization?.user_role;

  const { data, isLoading: loadingSetup } = useQuery({
    queryKey: ['org-setup-status', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from('organizations')
        .select('setup_completed')
        .eq('id', orgId)
        .maybeSingle();
      return data as { setup_completed: boolean } | null;
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });

  if (isLoading || loadingSetup) return <>{children}</>;

  const exempt = EXEMPT_PREFIXES.some((p) => location.pathname.startsWith(p));
  const isAdminLike = role === 'admin' || role === 'management' || role === 'org_admin';

  if (!exempt && orgId && data && data.setup_completed === false && isAdminLike) {
    return <Navigate to="/setup/wizard" replace />;
  }

  return <>{children}</>;
}