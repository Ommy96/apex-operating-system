import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Target, TrendingDown, Percent } from 'lucide-react';
import { useOrgSponsorshipMetrics } from '@/hooks/useSponsorshipCoverage';

export function SponsorshipMetrics() {
  const { data: metrics, isLoading } = useOrgSponsorshipMetrics();

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (!metrics || metrics.totalRequired === 0) {
    return null; // Don't show if no sponsorship data
  }

  const getStatusColor = () => {
    if (metrics.coverageRate >= 80) return 'text-success';
    if (metrics.coverageRate >= 40) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Sponsorship Coverage Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">KES {metrics.totalRequired.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Required</p>
          </div>
          <div className="text-center">
            <DollarSign className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-success">KES {metrics.totalReceived.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Received</p>
          </div>
          <div className="text-center">
            <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-lg font-bold text-destructive">KES {metrics.gap.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Funding Gap</p>
          </div>
          <div className="text-center">
            <Percent className={`h-5 w-5 mx-auto mb-1 ${getStatusColor()}`} />
            <p className={`text-lg font-bold ${getStatusColor()}`}>{metrics.coverageRate}%</p>
            <p className="text-xs text-muted-foreground">Coverage Rate</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Overall Sponsorship Coverage</span>
            <span className={`text-xs font-bold ${getStatusColor()}`}>{metrics.coverageRate}%</span>
          </div>
          <Progress value={metrics.coverageRate} className="h-2.5" />
        </div>
      </CardContent>
    </Card>
  );
}
