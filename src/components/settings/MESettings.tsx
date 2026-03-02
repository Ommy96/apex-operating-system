import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  section: 'me-logframe' | 'me-surveys';
}

export function MESettings({ section }: Props) {
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;

  if (section === 'me-logframe') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">LogFrame Configuration</CardTitle>
            <CardDescription>Configure default templates and indicator calculation settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Default Reporting Frequency</Label>
              <Select defaultValue="quarterly" disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="biannual">Bi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Default Indicator Calculation</Label>
              <Select defaultValue="cumulative" disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cumulative">Cumulative</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="latest">Latest Value</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {[
              { key: 'autoProgressCalc', label: 'Auto-Calculate Progress', desc: 'Automatically compute progress percentages from targets' },
              { key: 'enableVarianceAlerts', label: 'Variance Alerts', desc: 'Alert when indicators deviate >20% from targets' },
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

  // me-surveys
  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Survey & Scoring Settings</CardTitle>
          <CardDescription>Configure survey templates and scoring weights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'autoCompare', label: 'Auto Baseline-Endline Comparison', desc: 'Automatically compare baseline and endline survey results' },
            { key: 'enableScoring', label: 'Survey Scoring', desc: 'Enable weighted scoring for survey responses' },
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
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Risk & Performance Scoring Weights</CardTitle>
          <CardDescription>Adjust the weight of each factor in risk and performance calculations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {[
            { label: 'Academic Performance Weight', defaultValue: 30 },
            { label: 'Engagement Score Weight', defaultValue: 25 },
            { label: 'Dropout Risk Weight', defaultValue: 25 },
            { label: 'Follow-up Compliance Weight', defaultValue: 20 },
          ].map(item => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{item.label}</Label>
                <Badge variant="secondary">{item.defaultValue}%</Badge>
              </div>
              <Slider defaultValue={[item.defaultValue]} max={100} step={5} disabled={!isAdmin} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
