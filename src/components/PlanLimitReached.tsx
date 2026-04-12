import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePlanLimits } from '@/hooks/usePlanLimits';

interface PlanLimitReachedProps {
  resourceName: string;
  currentCount: number;
  limitKey: 'max_beneficiaries' | 'max_projects' | 'max_users' | 'max_programmes';
}

export function PlanLimitReached({ resourceName, currentCount, limitKey }: PlanLimitReachedProps) {
  const navigate = useNavigate();
  const { limits, tier, isUnlimited } = usePlanLimits();

  if (isUnlimited) return null;

  const max = limits[limitKey];
  if (currentCount < max) return null;

  return (
    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-300">Plan limit reached</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-amber-700 dark:text-amber-400">
          Your <span className="font-semibold capitalize">{tier}</span> plan includes up to{' '}
          <span className="font-semibold">{max.toLocaleString()}</span> {resourceName.toLowerCase()}. 
          Upgrade your plan to add more.
        </p>
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => navigate('/organization-settings?tab=billing')}
        >
          Upgrade Plan <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
