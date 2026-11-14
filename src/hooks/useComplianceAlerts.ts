import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { visibleComplianceAlerts } from '@/lib/complianceAlerts';

export function useComplianceAlerts() {
  const { currentOrganization } = useOrganization();
  const { can } = usePermissions();
  const orgId = currentOrganization?.organization_id;
  const { data, error } = useQuery({
    queryKey: ['organization-compliance', orgId],
    queryFn: async () => {
      if (!orgId || !can.manageSettings) return null;
      const { data, error } = await supabase.from('organizations')
        .select('kra_exemption_expiry, ngo_board_cert_expiry, pbo_number, pbo_expiry, kra_exemption_cert_url, ngo_board_cert_url')
        .eq('id', orgId).single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(orgId) && can.manageSettings,
    refetchInterval: 60_000,
  });
  useEffect(() => {
    if (error && can.manageSettings) toast.error(`Could not load compliance alerts: ${error.message}`);
  }, [error, can.manageSettings]);
  return visibleComplianceAlerts(data, can.manageSettings);
}