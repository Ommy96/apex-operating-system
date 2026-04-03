import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Shield, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionManagerProps {
  children: React.ReactNode;
}

const IDLE_TIMEOUT_KEY = 'ufanisi_last_active';
const DEFAULT_IDLE_MINUTES = 30;
const WARNING_SECONDS = 120; // 2-minute warning

export function SessionManager({ children }: SessionManagerProps) {
  const { user, userRole, forceSessionRefresh, signOut } = useAuth();
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
  const [idleWarning, setIdleWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_SECONDS);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

  // --- Idle timeout logic ---
  const updateActivity = useCallback(() => {
    localStorage.setItem(IDLE_TIMEOUT_KEY, Date.now().toString());
    // If warning is showing and user interacts, dismiss it
    if (idleWarning) {
      setIdleWarning(false);
      setCountdown(WARNING_SECONDS);
      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
        warningTimerRef.current = null;
      }
    }
  }, [idleWarning]);

  const handleIdleLogout = useCallback(async () => {
    setIdleWarning(false);
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    toast({
      title: "Session expired",
      description: "You were logged out due to inactivity.",
      variant: "destructive",
    });
    await signOut();
    navigate('/auth');
  }, [signOut, navigate]);

  // Start warning countdown
  const startWarning = useCallback(() => {
    setIdleWarning(true);
    setCountdown(WARNING_SECONDS);

    warningTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleIdleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [handleIdleLogout]);

  // Main idle check loop
  useEffect(() => {
    if (!user) return;

    const idleMs = DEFAULT_IDLE_MINUTES * 60 * 1000;

    const checkIdle = () => {
      const lastActive = parseInt(localStorage.getItem(IDLE_TIMEOUT_KEY) || Date.now().toString(), 10);
      const elapsed = Date.now() - lastActive;

      if (elapsed >= idleMs && !idleWarning) {
        startWarning();
      }
    };

    // Update activity on user interaction
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));
    updateActivity(); // set initial timestamp

    // Check every 30 seconds
    idleTimerRef.current = setInterval(checkIdle, 30_000);

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    };
  }, [user, idleWarning, updateActivity, startWarning]);

  // --- Privilege change logic (unchanged) ---
  useEffect(() => {
    if (!user?.id) return;

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

  useEffect(() => {
    if (!user?.id) return;

    const handleRoleChange = (event: CustomEvent) => {
      const { oldRole, newRole } = event.detail;
      if (!oldRole || !newRole || oldRole === newRole) return;

      const oldLevel = getRoleLevel(oldRole);
      const newLevel = getRoleLevel(newRole);
      
      if (newLevel > oldLevel) {
        setPrivilegeDialog({ isOpen: true, type: 'escalation', oldRole, newRole });
      } else if (newLevel < oldLevel) {
        setPrivilegeDialog({ isOpen: true, type: 'reduction', oldRole, newRole });
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
    await forceSessionRefresh();
    if (privilegeDialog.type === 'reduction') {
      setTimeout(() => { window.location.reload(); }, 1000);
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

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {children}
      
      {/* Privilege change dialog */}
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

      {/* Idle timeout warning dialog */}
      <AlertDialog open={idleWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-orange-500" />
              Session Timeout Warning
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will be logged out due to inactivity in{' '}
              <span className="font-bold text-foreground">{formatCountdown(countdown)}</span>.
              Click "Stay Logged In" to continue your session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={handleIdleLogout}>
                Logout Now
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={updateActivity}>
                Stay Logged In
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
