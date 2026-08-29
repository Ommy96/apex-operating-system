import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plug, Key, Webhook, ExternalLink } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { UnsavedBar } from '@/components/settings/UnsavedBar';

const SERVICE_DEFAULTS = {
  mpesa: false,
  resend: true,
  whatsapp: false,
  africasTalkingSms: false,
};

interface Props {
  section: 'int-apis' | 'int-services';
}

export function IntegrationSettings({ section }: Props) {
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;
  const services = useOrgSettings('integrations_services', SERVICE_DEFAULTS, {
    successMessage: 'Integration settings saved',
  });

  if (section === 'int-apis') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">API & Webhook Configuration</CardTitle>
            <CardDescription>Manage API access, keys, and webhook endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Public API Access</p>
                    <p className="text-xs text-muted-foreground">Generate API keys for third-party integrations</p>
                  </div>
                </div>
                {isAdmin && <Button variant="outline" size="sm">Generate Key</Button>}
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Webhook className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Webhook Endpoints</p>
                    <p className="text-xs text-muted-foreground">Configure webhook URLs for event notifications</p>
                  </div>
                </div>
                {isAdmin && <Button variant="outline" size="sm">Add Webhook</Button>}
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-muted/20">
              <p className="text-sm font-medium mb-2">Access Logs</p>
              <p className="text-xs text-muted-foreground">No API access logs yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // int-services
  const CONNECTABLE = [
    { key: 'mpesa' as const, name: 'M-Pesa', desc: 'Mobile money disbursement and collection' },
    { key: 'resend' as const, name: 'Resend', desc: 'Transactional email delivery' },
    { key: 'whatsapp' as const, name: 'WhatsApp Business', desc: 'Outbound WhatsApp campaigns and alerts' },
    { key: 'africasTalkingSms' as const, name: "Africa's Talking SMS", desc: 'Bulk SMS to beneficiaries and staff' },
  ];

  const COMING_SOON = [
    { name: 'QuickBooks', desc: 'Accounting software sync' },
    { name: 'Mailchimp', desc: 'Email marketing integration' },
    { name: 'Google Workspace', desc: 'Google Drive & Calendar sync' },
    { name: 'Power BI', desc: 'Business intelligence connector' },
  ];

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Connected Services</CardTitle>
              <CardDescription>Enable or disable third-party integrations</CardDescription>
            </div>
            {isAdmin && (
              <UnsavedBar
                isDirty={services.isDirty}
                isSaving={services.isSaving}
                onSave={services.save}
                onReset={services.reset}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {services.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="space-y-3">
              {CONNECTABLE.map(service => (
                <div key={service.key} className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <Plug className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {services.values[service.key] && (
                      <Badge variant="secondary" className="border-primary/20 text-primary">Enabled</Badge>
                    )}
                    <Switch
                      disabled={!isAdmin}
                      checked={!!services.values[service.key]}
                      onCheckedChange={(v) => services.setField(service.key, v as any)}
                    />
                  </div>
                </div>
              ))}

              {COMING_SOON.map(service => (
                <div key={service.name} className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20 opacity-70">
                  <div className="flex items-center gap-3 min-w-0">
                    <Plug className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.desc}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">Coming Soon</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
