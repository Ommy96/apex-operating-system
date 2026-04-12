import { ReactNode } from 'react';
import { useFeatureFlag, useOrgPlanData } from '@/hooks/useFeatureFlag';
import { UpgradePrompt } from '@/components/UpgradePrompt';

interface FeatureFlagGuardProps {
  flag: string;
  moduleName: string;
  children: ReactNode;
}

export function FeatureFlagGuard({ flag, moduleName, children }: FeatureFlagGuardProps) {
  const { enabled, loading } = useFeatureFlag(flag);
  const { planData } = useOrgPlanData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Partners never see upgrade prompt
  if (planData?.is_partner === true) {
    return <>{children}</>;
  }

  if (!enabled) {
    return <UpgradePrompt moduleName={moduleName} flagName={flag} />;
  }

  return <>{children}</>;
}
