import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Shield, User, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoleChangeConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  user: {
    full_name: string;
    email: string;
    role: string;
  };
  newRole: string;
  isLoading: boolean;
}

export function RoleChangeConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  user,
  newRole,
  isLoading
}: RoleChangeConfirmationModalProps) {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'management': return 'default';
      case 'staff': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin': return 'Full system access, can manage all users and assign roles';
      case 'management': return 'Can view reports and manage programs, limited user access';
      case 'staff': return 'Can create and edit reports, view assigned children';
      default: return '';
    }
  };

  const isPrivilegeEscalation = () => {
    const roleHierarchy = { staff: 1, management: 2, admin: 3 };
    return roleHierarchy[newRole as keyof typeof roleHierarchy] > roleHierarchy[user.role as keyof typeof roleHierarchy];
  };

  const isPrivilegeReduction = () => {
    const roleHierarchy = { staff: 1, management: 2, admin: 3 };
    return roleHierarchy[newRole as keyof typeof roleHierarchy] < roleHierarchy[user.role as keyof typeof roleHierarchy];
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Confirm Role Change
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Role:</span>
                  <Badge variant={getRoleBadgeVariant(user.role) as any} className="capitalize">
                    {user.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New Role:</span>
                  <Badge variant={getRoleBadgeVariant(newRole) as any} className="capitalize">
                    {newRole}
                  </Badge>
                </div>
              </div>

              {(isPrivilegeEscalation() || isPrivilegeReduction()) && (
                <div className={`p-3 rounded-lg border-l-4 ${
                  isPrivilegeReduction() 
                    ? 'bg-destructive/5 border-destructive text-destructive' 
                    : 'bg-warning/5 border-warning text-warning'
                }`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {isPrivilegeReduction() ? 'Privilege Reduction' : 'Privilege Escalation'}
                    </span>
                  </div>
                  <p className="text-xs mt-1">
                    {isPrivilegeReduction() 
                      ? 'This user will lose access to certain features and data.'
                      : 'This user will gain access to additional features and data.'
                    }
                  </p>
                </div>
              )}

              <div className="p-3 bg-muted/20 rounded-lg">
                <p className="text-sm font-medium mb-1">New Role Permissions:</p>
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription(newRole)}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Are you sure you want to change <span className="font-medium">{user.full_name}</span>'s role 
                from <span className="font-medium capitalize">{user.role}</span> to <span className="font-medium capitalize">{newRole}</span>?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button 
              onClick={onConfirm}
              disabled={isLoading}
              variant={isPrivilegeReduction() ? "destructive" : "default"}
            >
              {isLoading ? "Updating..." : "Confirm Change"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}