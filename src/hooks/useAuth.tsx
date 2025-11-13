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

  // Function to fetch user role from user_roles table
  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      // Use the get_user_role function to get the highest role
      const { data, error } = await supabase.rpc('get_user_role', { user_id: userId });
      
      if (error) {
        console.error('Error fetching user role:', error);
        return 'staff';
      }
      
      return data || 'staff';
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

    // Subscribe to role changes for current user from user_roles table
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
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            // Fetch user role before setting loading to false
            const role = await fetchUserRole(session.user.id);
            if (mounted) {
              setUserRole(role);
              setLoading(false);
            }
          } catch (error) {
            console.error('Error fetching role in auth state change:', error);
            if (mounted) {
              setUserRole('staff');
              setLoading(false);
            }
          }
        } else {
          if (mounted) {
            setUserRole(null);
            // Clean up real-time subscription
            if (roleChangeChannel) {
              supabase.removeChannel(roleChangeChannel);
              setRoleChangeChannel(null);
            }
            setLoading(false);
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          // Fetch user role for existing session before setting loading to false
          const role = await fetchUserRole(session.user.id);
          if (mounted) {
            setUserRole(role);
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching role on init:', error);
          if (mounted) {
            setUserRole('staff');
            setLoading(false);
          }
        }
      } else {
        if (mounted) {
          setLoading(false);
        }
      }
    }).catch(error => {
      console.error('Error in getSession:', error);
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    
    await supabase.auth.signOut();
    setUserRole(null);
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
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