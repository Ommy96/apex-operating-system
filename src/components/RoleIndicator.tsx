import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, User } from 'lucide-react';

export function RoleIndicator() {
  const { userRole } = useAuth();
  const { currentOrganization } = useOrganization();

  // Prefer the org-level role (admin/owner/member/staff) so the badge reflects
  // the user's role in the currently active organization, not their global
  // auth-level role which is always "staff" for new sign-ups.
  const effectiveRole = currentOrganization?.user_role || userRole;
  if (!effectiveRole) return null;

  const normalized = effectiveRole.toLowerCase();
  const isAdmin = normalized === 'admin' || normalized === 'owner' || normalized === 'org_admin';
  const isManagement = normalized === 'management' || normalized === 'manager';

  const getRoleIcon = () => {
    if (isAdmin) return <Shield className="h-3 w-3" />;
    if (isManagement) return <Users className="h-3 w-3" />;
    return <User className="h-3 w-3" />;
  };

  const getRoleVariant = () => {
    if (isAdmin) return 'destructive';
    if (isManagement) return 'default';
    return 'secondary';
  };

  const getRoleLabel = () => {
    if (normalized === 'org_admin') return 'Admin';
    return effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1);
  };

  return (
    <Badge variant={getRoleVariant() as any} className="flex items-center gap-1 text-xs">
      {getRoleIcon()}
      {getRoleLabel()}
    </Badge>
  );
}