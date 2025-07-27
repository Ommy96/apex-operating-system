import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionManagerProps {
  children: React.ReactNode;
}

export function SessionManager({ children }: SessionManagerProps) {
  const { user, userRole, forceSessionRefresh } = useAuth();
  const [privilegeDialog, setPrivilegeDialog] = useState<{
    isOpen: boolean;
    type: 'escalation' | 'reduction' | null;
    oldRole: string;
    newRole: string;
  }>({
    isOpen: false,
    type: null,
    oldRole: '',
    newRole: ''
  });
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to global role changes for admin notifications
    const channel = supabase
      .channel('global-role-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: 'event_type=eq.role_change'
        },
        (payload) => {
          // Show toast notification for admins about any role changes
          if (userRole === 'admin') {
            const metadata = payload.new.metadata;
            const oldRole = payload.new.old_values?.role;
            const newRole = payload.new.new_values?.role;
            
            if (metadata?.target_user_name) {
              toast({
                title: "Role Change Detected",
                description: `${metadata.target_user_name}: ${oldRole} → ${newRole}`,
                variant: "default",
              });
            }
          }
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id, userRole]);

  // Listen for role changes that require special handling
  useEffect(() => {
    if (!user?.id) return;

    const handleRoleChange = (event: CustomEvent) => {
      const { oldRole, newRole } = event.detail;
      
      if (!oldRole || !newRole || oldRole === newRole) return;

      const oldLevel = getRoleLevel(oldRole);
      const newLevel = getRoleLevel(newRole);
      
      // Determine if this is escalation or reduction
      if (newLevel > oldLevel) {
        setPrivilegeDialog({
          isOpen: true,
          type: 'escalation',
          oldRole,
          newRole
        });
      } else if (newLevel < oldLevel) {
        setPrivilegeDialog({
          isOpen: true,
          type: 'reduction',
          oldRole,
          newRole
        });
      }
    };

    window.addEventListener('roleChange', handleRoleChange as EventListener);
    
    return () => {
      window.removeEventListener('roleChange', handleRoleChange as EventListener);
    };
  }, [user?.id]);

  const getRoleLevel = (role: string) => {
    switch (role) {
      case 'staff': return 1;
      case 'management': return 2; 
      case 'admin': return 3;
      default: return 0;
    }
  };

  const handlePrivilegeChange = async () => {
    setPrivilegeDialog({ isOpen: false, type: null, oldRole: '', newRole: '' });
    
    // Force session refresh for significant privilege changes
    await forceSessionRefresh();
    
    // For privilege reductions, reload the page to clear any cached data
    if (privilegeDialog.type === 'reduction') {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const getDialogContent = () => {
    if (privilegeDialog.type === 'escalation') {
      return {
        title: "Privileges Upgraded",
        description: `Your role has been upgraded from ${privilegeDialog.oldRole} to ${privilegeDialog.newRole}. You now have access to additional features and data.`,
        icon: <Shield className="h-6 w-6 text-green-500" />,
        buttonText: "Continue with New Privileges",
        variant: "default" as const
      };
    } else {
      return {
        title: "Privileges Reduced",
        description: `Your role has been changed from ${privilegeDialog.oldRole} to ${privilegeDialog.newRole}. Some features may no longer be accessible. The page will reload to apply changes.`,
        icon: <AlertTriangle className="h-6 w-6 text-orange-500" />,
        buttonText: "Acknowledge Changes",
        variant: "destructive" as const
      };
    }
  };

  const dialogContent = getDialogContent();

  return (
    <>
      {children}
      
      <AlertDialog open={privilegeDialog.isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {dialogContent.icon}
              {dialogContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button 
                variant={dialogContent.variant}
                onClick={handlePrivilegeChange}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {dialogContent.buttonText}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}