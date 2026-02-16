import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  useFeatureFlags, 
  useFeatureFlagManagement,
} from '@/hooks/useSystemAdmin';
import { 
  Flag,
  Loader2,
} from 'lucide-react';

export function SystemMonitoring() {
  const { data: featureFlags, isLoading: flagsLoading } = useFeatureFlags();
  const { toggleFlag } = useFeatureFlagManagement();

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            Feature Flags
          </CardTitle>
          <CardDescription>Control feature availability across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {flagsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {featureFlags?.map((flag) => (
                <div key={flag.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                  <Switch
                    checked={flag.is_enabled}
                    onCheckedChange={(checked) => toggleFlag.mutate({ flagId: flag.id, isEnabled: checked })}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{flag.flag_name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {flag.flag_key}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{flag.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {flag.target_tiers.map((tier) => (
                      <Badge key={tier} variant="secondary" className="text-xs">
                        {tier}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
