import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';

const PLAN_FEATURES: Record<string, string[]> = {
  field_mode: ['Professional', 'Enterprise'],
  ai_insights: ['Professional', 'Enterprise'],
  automation: ['Professional', 'Enterprise'],
  multi_branch: ['Enterprise'],
};

interface UpgradePromptProps {
  moduleName: string;
  flagName: string;
}

export function UpgradePrompt({ moduleName, flagName }: UpgradePromptProps) {
  const navigate = useNavigate();
  const availableIn = PLAN_FEATURES[flagName] || ['Professional', 'Enterprise'];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 w-16 h-16 flex items-center justify-center mb-2">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>{moduleName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">This module is not included in your current plan.</p>
            <div className="bg-muted rounded-lg p-4 text-left space-y-2">
              <p className="text-sm font-medium">Available in:</p>
              {availableIn.map(plan => (
                <div key={plan} className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  {plan} Plan
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={() => navigate('/organization-settings?tab=billing')}>
              Upgrade Plan <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
