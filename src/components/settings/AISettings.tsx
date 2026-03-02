import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';

export function AISettings() {
  const { can, isSuperAdmin } = usePermissions();
  const isAdmin = can.manageSettings || isSuperAdmin;

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">AI & Intelligence Configuration</CardTitle>
          <CardDescription>Control AI features, risk sensitivity, and automated insights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'aiAssistant', label: 'AI Insight Assistant', desc: 'Enable the AI-powered analytics assistant', defaultChecked: true },
            { key: 'riskPrediction', label: 'Risk Prediction Engine', desc: 'Use AI to predict beneficiary and organizational risks', defaultChecked: true },
            { key: 'autoSummaries', label: 'Automated Report Summaries', desc: 'Auto-generate executive summaries for reports', defaultChecked: false },
            { key: 'anomalyDetection', label: 'Anomaly Detection', desc: 'Detect unusual patterns in data and spending', defaultChecked: false },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div>
                <Label className="text-sm font-medium">{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch disabled={!isAdmin} defaultChecked={item.defaultChecked} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Sensitivity Tuning</CardTitle>
          <CardDescription>Adjust AI prediction and scoring sensitivity levels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {[
            { label: 'Risk Prediction Sensitivity', defaultValue: 70, desc: 'Higher = more sensitive (more alerts)' },
            { label: 'Performance Scoring Strictness', defaultValue: 50, desc: 'Higher = stricter scoring' },
            { label: 'Anomaly Detection Threshold', defaultValue: 80, desc: 'Higher = fewer false positives' },
          ].map(item => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
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
