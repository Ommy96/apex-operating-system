import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plug, Key, Webhook, ExternalLink } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  section: 'int-apis' | 'int-services';
}

export function IntegrationSettings({ section }: Props) {
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;

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
  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Connected Services</CardTitle>
          <CardDescription>Enable or disable third-party integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'MPesa', desc: 'Mobile money payment integration', status: 'available' },
              { name: 'QuickBooks', desc: 'Accounting software sync', status: 'coming_soon' },
              { name: 'Mailchimp', desc: 'Email marketing integration', status: 'coming_soon' },
              { name: 'Google Workspace', desc: 'Google Drive & Calendar sync', status: 'coming_soon' },
              { name: 'Power BI', desc: 'Business intelligence connector', status: 'coming_soon' },
              { name: 'Resend', desc: 'Email delivery service', status: 'connected' },
            ].map(service => (
              <div key={service.name} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-3">
                  <Plug className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {service.status === 'connected' && <Badge variant="secondary" className="border-primary/20 text-primary">Connected</Badge>}
                  {service.status === 'coming_soon' && <Badge variant="outline" className="text-xs">Coming Soon</Badge>}
                  {service.status === 'available' && (
                    <Button variant="outline" size="sm" disabled={!isAdmin}>Connect</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
