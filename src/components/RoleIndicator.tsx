import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, User } from 'lucide-react';

export function RoleIndicator() {
  const { userRole, isAdmin, isManagement, isStaff } = useAuth();

  if (!userRole) return null;

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
    return userRole.charAt(0).toUpperCase() + userRole.slice(1);
  };

  return (
    <Badge variant={getRoleVariant() as any} className="flex items-center gap-1 text-xs">
      {getRoleIcon()}
      {getRoleLabel()}
    </Badge>
  );
}