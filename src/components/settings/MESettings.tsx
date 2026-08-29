import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { UnsavedBar } from '@/components/settings/UnsavedBar';

interface Props {
  section: 'me-logframe' | 'me-surveys';
}

const LOGFRAME_DEFAULTS = {
  reportingFrequency: 'quarterly',
  indicatorCalculation: 'cumulative',
  autoProgressCalc: true,
  enableVarianceAlerts: true,
};

const SURVEY_DEFAULTS = {
  autoCompare: true,
  enableScoring: true,
  weightAcademic: 30,
  weightEngagement: 25,
  weightDropout: 25,
  weightFollowUp: 20,
};

const WEIGHTS = [
  { key: 'weightAcademic', label: 'Academic Performance Weight' },
  { key: 'weightEngagement', label: 'Engagement Score Weight' },
  { key: 'weightDropout', label: 'Dropout Risk Weight' },
  { key: 'weightFollowUp', label: 'Follow-up Compliance Weight' },
] as const;

export function MESettings({ section }: Props) {
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;

  const logframe = useOrgSettings('me_logframe', LOGFRAME_DEFAULTS, {
    successMessage: 'LogFrame settings saved',
  });
  const surveys = useOrgSettings('me_surveys', SURVEY_DEFAULTS, {
    successMessage: 'Survey settings saved',
  });

  if (section === 'me-logframe') {
    return (
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">LogFrame Configuration</CardTitle>
                <CardDescription>Configure default templates and indicator calculation settings</CardDescription>
              </div>
              {isAdmin && (
                <UnsavedBar
                  isDirty={logframe.isDirty}
                  isSaving={logframe.isSaving}
                  onSave={logframe.save}
                  onReset={logframe.reset}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {logframe.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Default Reporting Frequency</Label>
                  <Select
                    value={logframe.values.reportingFrequency}
                    onValueChange={(v) => logframe.setField('reportingFrequency', v)}
                    disabled={!isAdmin}
                  >
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
                  <Select
                    value={logframe.values.indicatorCalculation}
                    onValueChange={(v) => logframe.setField('indicatorCalculation', v)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cumulative">Cumulative</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="latest">Latest Value</SelectItem>
                      <SelectItem value="sum">Sum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {([
                  { key: 'autoProgressCalc', label: 'Auto-Calculate Progress', desc: 'Automatically compute progress percentages from targets' },
                  { key: 'enableVarianceAlerts', label: 'Variance Alerts', desc: 'Alert when indicators deviate >20% from targets' },
                ] as const).map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
                    <div>
                      <Label className="text-sm font-medium">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      disabled={!isAdmin}
                      checked={!!logframe.values[item.key]}
                      onCheckedChange={(v) => logframe.setField(item.key, v as any)}
                    />
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // me-surveys
  const weightTotal = WEIGHTS.reduce((sum, w) => sum + (Number(surveys.values[w.key]) || 0), 0);

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Survey & Scoring Settings</CardTitle>
              <CardDescription>Configure survey templates and scoring weights</CardDescription>
            </div>
            {isAdmin && (
              <UnsavedBar
                isDirty={surveys.isDirty}
                isSaving={surveys.isSaving}
                onSave={surveys.save}
                onReset={surveys.reset}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {surveys.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            ([
              { key: 'autoCompare', label: 'Auto Baseline-Endline Comparison', desc: 'Automatically compare baseline and endline survey results' },
              { key: 'enableScoring', label: 'Survey Scoring', desc: 'Enable weighted scoring for survey responses' },
            ] as const).map(item => (
              <div key={item.key} className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  disabled={!isAdmin}
                  checked={!!surveys.values[item.key]}
                  onCheckedChange={(v) => surveys.setField(item.key, v as any)}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Risk & Performance Scoring Weights</CardTitle>
          <CardDescription>
            Adjust the weight of each factor in risk and performance calculations
            {' · '}
            <span className={weightTotal === 100 ? 'text-primary' : 'text-destructive'}>
              Total {weightTotal}%
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {surveys.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            WEIGHTS.map(item => (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{item.label}</Label>
                  <Badge variant="secondary">{surveys.values[item.key]}%</Badge>
                </div>
                <Slider
                  value={[Number(surveys.values[item.key]) || 0]}
                  onValueChange={([v]) => surveys.setField(item.key, v as any)}
                  max={100}
                  step={5}
                  disabled={!isAdmin}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
