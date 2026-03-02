import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  section: 'partner-access' | 'volunteer-settings';
}

export function PartnerVolunteerSettings({ section }: Props) {
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;

  if (section === 'partner-access') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Partner Access Controls</CardTitle>
            <CardDescription>Define data sharing scope and project visibility for partners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'sharedProjects', label: 'Shared Project Visibility', desc: 'Allow partners to view shared project progress' },
              { key: 'dataSharingScope', label: 'Data Sharing Scope', desc: 'Limit what data partners can see (aggregated only)' },
              { key: 'partnerReporting', label: 'Partner Reporting Access', desc: 'Allow partners to generate shared reports' },
              { key: 'partnerComms', label: 'Partner Communication Channel', desc: 'Enable direct messaging with partner organizations' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch disabled={!isAdmin} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // volunteer-settings
  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Volunteer Settings</CardTitle>
          <CardDescription>Configure volunteer onboarding, roles, and impact tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'onboardingWorkflow', label: 'Volunteer Onboarding Workflow', desc: 'Require volunteers to complete an onboarding process' },
            { key: 'volunteerRoles', label: 'Volunteer Role Permissions', desc: 'Assign specific permissions to volunteer accounts' },
            { key: 'impactTracking', label: 'Impact Tracking Templates', desc: 'Enable volunteer-specific impact measurement' },
            { key: 'hoursTracking', label: 'Hours Tracking', desc: 'Track volunteer hours and contributions' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div>
                <Label className="text-sm font-medium">{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch disabled={!isAdmin} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
