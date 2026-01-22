import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

  // Function to fetch user role
  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single();
      return profile?.role || 'staff';
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'staff';
    }
  }, []);

  // Function to refresh user role
  const refreshUserRole = useCallback(async () => {
    if (!user?.id) return;
    
    const newRole = await fetchUserRole(user.id);
    const previousRole = userRole;
    
    if (newRole !== previousRole) {
      setUserRole(newRole);
      
      // Show notification about role change
      if (previousRole) {
        const isEscalation = getRoleLevel(newRole) > getRoleLevel(previousRole);
        toast({
          title: isEscalation ? "Privileges Upgraded" : "Privileges Updated",
          description: `Your role has been changed from ${previousRole} to ${newRole}`,
          variant: isEscalation ? "default" : "destructive",
        });
        
        // Force page reload for significant privilege changes
        if (Math.abs(getRoleLevel(newRole) - getRoleLevel(previousRole)) > 1) {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      }
    }
  }, [user?.id, userRole, fetchUserRole]);

  // Function to force session refresh
  const forceSessionRefresh = useCallback(async () => {
    try {
      await supabase.auth.refreshSession();
      await refreshUserRole();
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }, [refreshUserRole]);

  // Helper function to get role hierarchy level
  const getRoleLevel = (role: string) => {
    switch (role) {
      case 'staff': return 1;
      case 'management': return 2;
      case 'admin': return 3;
      default: return 0;
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to role changes for current user
    const channel = supabase
      .channel('role-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Role change detected:', payload);
          
          // Small delay to ensure database consistency
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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile to get role
          setTimeout(() => {
            fetchUserRole(session.user!.id)
              .then((role) => setUserRole(role))
              .catch(() => setUserRole('staff'));
          }, 0);
        } else {
          setUserRole(null);
          // Clean up real-time subscription
          if (roleChangeChannel) {
            supabase.removeChannel(roleChangeChannel);
            setRoleChangeChannel(null);
          }
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch user profile for existing session
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    // Clean up real-time subscription before signing out
    if (roleChangeChannel) {
      supabase.removeChannel(roleChangeChannel);
      setRoleChangeChannel(null);
    }

    try {
      // Use local scope to ensure sign-out works even if the network request fails.
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      // Force local UI state reset immediately (onAuthStateChange should also fire).
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