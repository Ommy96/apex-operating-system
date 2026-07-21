import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManagement: boolean;
  isStaff: boolean;
  userRole: string | null;
  refreshUserRole: () => Promise<void>;
  forceSessionRefresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleChangeChannel, setRoleChangeChannel] = useState<any>(null);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .rpc('get_user_role', { user_id: userId });
      const globalRole = (data as string) || 'staff';
      // If the global user_roles table has no admin row for this user,
      // fall back to org-level membership: an admin/owner in ANY organization
      // should be treated as admin so UI gates (isAdmin) unlock. This keeps a
      // single source of truth without forcing every button to re-check org
      // membership individually.
      if (globalRole !== 'admin') {
        try {
          const { data: memberships } = await supabase
            .from('organization_members')
            .select('role')
            .eq('user_id', userId);
          const rows = (memberships as { role: string }[] | null) || [];
          const isOrgAdmin = rows.some(
            (m) =>
              m.role === 'admin' ||
              m.role === 'owner' ||
              m.role === 'org_admin'
          );
          if (isOrgAdmin) return 'admin';
          if (globalRole === 'staff' && rows.some((m) => m.role === 'management' || m.role === 'manager')) {
            return 'management';
          }
        } catch (e) {
          logger.error('Org membership role lookup failed:', e);
        }
      }
      return globalRole;
    } catch (error) {
      logger.error('Error fetching user role:', error);
      return 'staff';
    }
  }, []);

  const refreshUserRole = useCallback(async () => {
    if (!user?.id) return;
    
    const newRole = await fetchUserRole(user.id);
    const previousRole = userRole;
    
    if (newRole !== previousRole) {
      setUserRole(newRole);
      
      if (previousRole) {
        const isEscalation = getRoleLevel(newRole) > getRoleLevel(previousRole);
        toast({
          title: isEscalation ? "Privileges Upgraded" : "Privileges Updated",
          description: `Your role has been changed from ${previousRole} to ${newRole}`,
          variant: isEscalation ? "default" : "destructive",
        });
        
        if (Math.abs(getRoleLevel(newRole) - getRoleLevel(previousRole)) > 1) {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      }
    }
  }, [user?.id, userRole, fetchUserRole]);

  const forceSessionRefresh = useCallback(async () => {
    try {
      await supabase.auth.refreshSession();
      await refreshUserRole();
    } catch (error) {
      logger.error('Error refreshing session:', error);
    }
  }, [refreshUserRole]);

  const getRoleLevel = (role: string) => {
    switch (role) {
      case 'staff': return 1;
      case 'management': return 2;
      case 'admin': return 3;
      default: return 0;
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('role-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          logger.log('Role change detected:', payload);
          setTimeout(async () => {
            await refreshUserRole();
          }, 500);
        }
      )
      .subscribe();

    setRoleChangeChannel(channel);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id, refreshUserRole]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user!.id)
              .then((role) => setUserRole(role))
              .catch(() => setUserRole('staff'));
          }, 0);
        } else {
          setUserRole(null);
          if (roleChangeChannel) {
            supabase.removeChannel(roleChangeChannel);
            setRoleChangeChannel(null);
          }
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    
    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Please check your email to confirm your account.",
      });
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Check rate limit before attempting login
    try {
      const { data: allowed, error: rlError } = await supabase.rpc('check_rate_limit', {
        user_id_param: '00000000-0000-0000-0000-000000000000', // anonymous UUID for pre-auth
        action_type_param: `login:${email.toLowerCase()}`,
        max_attempts: 5,
        window_minutes: 15,
      });

      if (rlError) {
        logger.error('Rate limit check failed:', rlError);
        // Proceed anyway if rate limit check itself fails (don't lock users out due to infra issue)
      } else if (allowed === false) {
        const msg = 'Too many login attempts. Please wait 15 minutes before trying again.';
        toast({ title: "Login blocked", description: msg, variant: "destructive" });
        return { error: { message: msg } };
      }
    } catch (err) {
      logger.error('Rate limit RPC error:', err);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (data.user) {
      supabase.from('profiles').update({ last_login_at: new Date().toISOString() })
        .eq('user_id', data.user.id).then(() => {});

      // Check 2FA requirement for org_admin roles
      try {
        const role = await fetchUserRole(data.user.id);
        if (role === 'admin') {
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const totpFactors = factorsData?.totp || [];
          if (totpFactors.length === 0) {
            sessionStorage.setItem('requires_2fa_setup', 'true');
          } else {
            sessionStorage.removeItem('requires_2fa_setup');
          }
        }
      } catch (e) {
        logger.error('MFA check failed:', e);
      }
    }
    
    return { error };
  };

  const signOut = async () => {
    if (roleChangeChannel) {
      supabase.removeChannel(roleChangeChannel);
      setRoleChangeChannel(null);
    }

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      setSession(null);
      setUser(null);
      setUserRole(null);
      setLoading(false);

      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    }
  };

  const isAdmin = userRole === 'admin';
  const isManagement = userRole === 'management' || isAdmin;
  const isStaff = userRole === 'staff';

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
    isManagement,
    isStaff,
    userRole,
    refreshUserRole,
    forceSessionRefresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
