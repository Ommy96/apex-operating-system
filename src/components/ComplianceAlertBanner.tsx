import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useComplianceAlerts } from '@/hooks/useComplianceAlerts';
import { COMPLIANCE_LEVEL, COMPLIANCE_SETTINGS_URL } from '@/lib/complianceAlerts';

export function ComplianceAlertBanner() {
  const alerts = useComplianceAlerts().filter(a => a.level.toLowerCase() === COMPLIANCE_LEVEL.RED.toLowerCase());

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map(a => (
        <Alert key={a.id} variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{a.message} <Link className="underline font-medium" to={COMPLIANCE_SETTINGS_URL}>Update certificate</Link></AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
