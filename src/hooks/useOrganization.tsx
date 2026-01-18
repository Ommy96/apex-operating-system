import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Organization {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  user_role: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  userOrganizations: Organization[];
  isLoading: boolean;
  error: string | null;
  switchOrganization: (orgId: string) => Promise<boolean>;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserOrganizations = useCallback(async () => {
    if (!user?.id) {
      setUserOrganizations([]);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations!inner (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('Error fetching user organizations:', fetchError);
        return;
      }

      if (data) {
        const orgs: Organization[] = data.map((item: any) => ({
          organization_id: item.organization_id,
          organization_name: item.organizations.name,
          organization_slug: item.organizations.slug,
          user_role: item.role,
        }));
        setUserOrganizations(orgs);
      }
    } catch (err) {
      console.error('Error in fetchUserOrganizations:', err);
    }
  }, [user?.id]);

  const fetchCurrentOrganization = useCallback(async () => {
    if (!user?.id) {
      setCurrentOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_user_current_organization', { _user_id: user.id });

      if (fetchError) {
        console.error('Error fetching organization:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data && data.length > 0) {
        setCurrentOrganization(data[0]);
      } else {
        setCurrentOrganization(null);
      }
    } catch (err) {
      console.error('Error in fetchCurrentOrganization:', err);
      setError('Failed to fetch organization');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const switchOrganization = useCallback(async (orgId: string): Promise<boolean> => {
    if (!user?.id) {
      toast.error('You must be logged in to switch organizations');
      return false;
    }

    try {
      const { data, error: switchError } = await supabase
        .rpc('switch_user_organization', { 
          _user_id: user.id, 
          _org_id: orgId 
        });

      if (switchError) {
        console.error('Error switching organization:', switchError);
        toast.error('Failed to switch organization');
        return false;
      }

      if (data) {
        await fetchCurrentOrganization();
        toast.success('Organization switched successfully');
        // Force page reload to refresh all data with new org context
        window.location.reload();
        return true;
      } else {
        toast.error('You do not have access to this organization');
        return false;
      }
    } catch (err) {
      console.error('Error in switchOrganization:', err);
      toast.error('Failed to switch organization');
      return false;
    }
  }, [user?.id, fetchCurrentOrganization]);

  const refreshOrganization = useCallback(async () => {
    await Promise.all([fetchCurrentOrganization(), fetchUserOrganizations()]);
  }, [fetchCurrentOrganization, fetchUserOrganizations]);

  useEffect(() => {
    fetchCurrentOrganization();
    fetchUserOrganizations();
  }, [fetchCurrentOrganization, fetchUserOrganizations]);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        userOrganizations,
        isLoading,
        error,
        switchOrganization,
        refreshOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
