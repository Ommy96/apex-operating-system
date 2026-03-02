import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  section: 'comp-data' | 'comp-audit' | 'comp-docs';
}

export function ComplianceSettings({ section }: Props) {
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;

  if (section === 'comp-data') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Data Protection</CardTitle>
            <CardDescription>GDPR-style consent, retention, and privacy controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Retention Period</Label>
              <Select defaultValue="7years" disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1year">1 Year</SelectItem>
                  <SelectItem value="3years">3 Years</SelectItem>
                  <SelectItem value="5years">5 Years</SelectItem>
                  <SelectItem value="7years">7 Years</SelectItem>
                  <SelectItem value="10years">10 Years</SelectItem>
                  <SelectItem value="indefinite">Indefinite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {[
              { key: 'consentTracking', label: 'Consent Tracking', desc: 'Track beneficiary consent for data collection' },
              { key: 'autoArchive', label: 'Auto-Archive Inactive Beneficiaries', desc: 'Archive beneficiaries inactive for 12+ months' },
              { key: 'rightToDelete', label: 'Right-to-Delete Workflow', desc: 'Enable data subject deletion requests' },
              { key: 'dataAnonymization', label: 'Data Anonymization', desc: 'Anonymize data on retention period expiry' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch disabled={!isAdmin} defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (section === 'comp-audit') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Audit Settings</CardTitle>
            <CardDescription>Configure audit log retention and export permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Log Retention Duration</Label>
              <Select defaultValue="2years" disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="1year">1 Year</SelectItem>
                  <SelectItem value="2years">2 Years</SelectItem>
                  <SelectItem value="5years">5 Years</SelectItem>
                  <SelectItem value="indefinite">Indefinite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {[
              { key: 'enableAudit', label: 'Enable Comprehensive Audit Logging', desc: 'Track all data changes across the platform' },
              { key: 'auditExport', label: 'Audit Export Permissions', desc: 'Allow admins to export audit logs' },
              { key: 'loginTracking', label: 'Login Activity Tracking', desc: 'Log all login attempts and sessions' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch disabled={!isAdmin} defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // comp-docs
  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Document Management Settings</CardTitle>
          <CardDescription>Configure file storage, versioning, and organization rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'versionControl', label: 'Version Control', desc: 'Track document versions with change notes' },
            { key: 'mandatoryAudit', label: 'Mandatory Audit Trail', desc: 'Log all document uploads, downloads, and edits' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div>
                <Label className="text-sm font-medium">{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch disabled={!isAdmin} defaultChecked />
            </div>
          ))}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Max File Size (MB)</Label>
            <Input type="number" defaultValue="25" disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Storage Quota</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted/30 rounded-full h-3 overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '35%' }} />
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">350 MB / 1 GB</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
