import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

export function ComplianceAlertBanner() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data: org } = useQuery({
    queryKey: ['org-compliance', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('kra_exemption_cert_url, kra_exemption_expiry, ngo_board_cert_url, ngo_board_cert_expiry')
        .eq('id', orgId!)
        .single();
      return data;
    },
    enabled: !!orgId,
  });

  if (!org) return null;

  const alerts: { type: 'danger' | 'warning' | 'info'; message: string }[] = [];

  if (!org.kra_exemption_cert_url) {
    alerts.push({ type: 'info', message: 'Upload your KRA Tax Exemption Certificate to track compliance.' });
  } else if (org.kra_exemption_expiry) {
    const expiry = new Date(org.kra_exemption_expiry);
    const daysUntil = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) {
      alerts.push({ type: 'danger', message: 'Your KRA Tax Exemption Certificate has expired. Update it immediately.' });
    } else if (daysUntil <= 60) {
      alerts.push({ type: 'warning', message: `Your KRA Tax Exemption Certificate expires in ${daysUntil} days. Renew it to maintain compliance.` });
    }
  }

  if (!org.ngo_board_cert_url) {
    alerts.push({ type: 'info', message: 'Upload your NGO Board Certificate to track registration status.' });
  } else if (org.ngo_board_cert_expiry) {
    const expiry = new Date(org.ngo_board_cert_expiry);
    const daysUntil = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) {
      alerts.push({ type: 'danger', message: 'Your NGO Board Certificate has expired. Renew immediately.' });
    } else if (daysUntil <= 60) {
      alerts.push({ type: 'warning', message: `Your NGO Board Certificate expires in ${daysUntil} days.` });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <Alert key={i} variant={a.type === 'danger' ? 'destructive' : 'default'} className={a.type === 'warning' ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : ''}>
          {a.type === 'danger' ? <ShieldAlert className="h-4 w-4" /> : a.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          <AlertDescription>{a.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
