import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  section: 'exec-dashboard' | 'exec-reports';
}

export function ExecutiveSettings({ section }: Props) {
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;

  if (section === 'exec-dashboard') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Dashboard Customization</CardTitle>
            <CardDescription>Configure executive dashboard widgets and KPIs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'orgHealth', label: 'Organization Health Score', desc: 'Show composite health score on dashboard' },
              { key: 'beneficiaryImpact', label: 'Beneficiary Impact Panel', desc: 'Display beneficiary impact metrics' },
              { key: 'donorFunding', label: 'Donor & Funding Intelligence', desc: 'Show funding overview and donor analytics' },
              { key: 'forecasting', label: 'Forecasting Engine', desc: 'Enable predictive analytics and trend forecasting' },
              { key: 'riskDashboard', label: 'Risk Dashboard', desc: 'Display organizational risk indicators' },
              { key: 'staffPerformance', label: 'Staff Performance Panel', desc: 'Show staff performance metrics' },
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

  // exec-reports
  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Report Templates</CardTitle>
          <CardDescription>Configure default templates for donor, board, and impact reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Donor Report Templates', items: ['Quarterly Update', 'Annual Summary', 'Impact Report', 'Financial Statement'] },
              { label: 'Board Report Templates', items: ['Executive Summary', 'Program Review', 'Financial Overview', 'Risk Assessment'] },
              { label: 'Impact Report Templates', items: ['Beneficiary Outcomes', 'Program Effectiveness', 'Cost-per-Impact', 'Theory of Change'] },
            ].map(group => (
              <div key={group.label} className="p-4 rounded-xl border bg-muted/20">
                <p className="text-sm font-medium mb-3">{group.label}</p>
                <div className="space-y-1.5">
                  {group.items.map(item => (
                    <Badge key={item} variant="secondary" className="text-xs mr-1">{item}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
