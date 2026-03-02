import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Zap, Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

interface Props {
  section: 'auto-workflows' | 'auto-alerts';
}

export function AutomationSettings({ section }: Props) {
  const { can, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const isAdmin = can.manageSettings || isSuperAdmin;

  if (section === 'auto-workflows') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Workflows & Triggers</CardTitle>
                <CardDescription>Manage automation rules, escalations, and approval workflows</CardDescription>
              </div>
              <Button onClick={() => navigate('/automation')} className="gap-2">
                <Zap className="h-4 w-4" /> Open Automation Engine
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'enableAutomation', label: 'Enable Automation Engine', desc: 'Allow automated workflows and triggers' },
              { key: 'autoEscalation', label: 'Auto Escalation', desc: 'Escalate unresolved alerts after 48 hours' },
              { key: 'approvalWorkflows', label: 'Approval Workflows', desc: 'Route sensitive changes through approval chains' },
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

  // auto-alerts
  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Alert & Notification Channels</CardTitle>
          <CardDescription>Configure how alerts and notifications are delivered</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'email', label: 'Email Notifications', desc: 'Receive important updates via email', icon: Mail, enabled: true },
            { key: 'inApp', label: 'In-App Notifications', desc: 'Show notifications within the platform', icon: Bell, enabled: true },
            { key: 'sms', label: 'SMS Alerts', desc: 'Receive critical alerts via SMS', icon: Smartphone, enabled: false },
            { key: 'slack', label: 'Slack Integration', desc: 'Push alerts to a Slack channel', icon: MessageSquare, enabled: false },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!item.enabled && <Badge variant="outline" className="text-xs">Coming Soon</Badge>}
                <Switch disabled={!isAdmin || !item.enabled} defaultChecked={item.enabled} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
