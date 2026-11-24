import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaffScope } from '@/hooks/useStaffScope';
import { landingPathFor, ORG_DASHBOARD_PATH } from '@/lib/staffScope';

/** The ONE place that decides org dashboard vs staff workspace. Wraps /dashboard (sign-in lands here). */
export function ScopedHomeGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useStaffScope();
  if (isLoading) return <div className="p-6 space-y-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-40 w-full" /></div>;
  if (isError || !data) return <Navigate to="/workspace" replace />;
  const path = landingPathFor(data.orgReach);
  if (path !== ORG_DASHBOARD_PATH) return <Navigate to={path} replace />;
  return <>{children}</>;
}
