import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateBurnRate, type BurnRateResult } from "@/lib/burnRate";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/hooks/useCurrency";
import { Skeleton } from "@/components/ui/skeleton";

interface BurnRateGaugeProps {
  grantId: string;
  grantName: string;
  totalBudget: number;
  currency: string;
  startDate: string;
  endDate: string;
}

const STATUS_COLORS: Record<BurnRateResult['status'], string> = {
  on_track: 'bg-emerald-500',
  underspending: 'bg-amber-500',
  at_risk: 'bg-amber-600',
  overspending: 'bg-destructive',
};

const STATUS_BADGE_VARIANT: Record<BurnRateResult['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  on_track: 'default',
  underspending: 'secondary',
  at_risk: 'secondary',
  overspending: 'destructive',
};

export function BurnRateGauge({ grantId, grantName, totalBudget, currency, startDate, endDate }: BurnRateGaugeProps) {
  const { formatAmount } = useCurrency();

  const { data: totalSpent, isLoading } = useQuery({
    queryKey: ["grant-expenses-total", grantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount")
        .eq("grant_id", grantId);
      if (error) throw error;
      return (data || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    },
    enabled: !!grantId,
  });

  if (isLoading || totalSpent === undefined) {
    return <Skeleton className="h-24 w-full" />;
  }

  const result = calculateBurnRate(
    totalBudget,
    totalSpent,
    new Date(startDate),
    new Date(endDate)
  );

  const progressValue = Math.min(result.pctSpent, 100);
  const barColor = STATUS_COLORS[result.status];

  return (
    <div className="space-y-2 p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground truncate">{grantName}</span>
        <Badge variant={STATUS_BADGE_VARIANT[result.status]} className="text-[10px]">
          {result.statusLabel}
        </Badge>
      </div>

      <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${progressValue}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{formatAmount(result.totalSpent, currency)} spent of {formatAmount(result.totalBudget, currency)}</span>
        <span>{result.pctSpent.toFixed(1)}%</span>
      </div>

      {result.daysUntilDepleted !== null && result.willOverspend && (
        <p className="text-[11px] text-destructive">
          At current burn rate, funds depleted in {result.daysUntilDepleted} days
          {result.projectedEndDate && ` (projected: ${result.projectedEndDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })})`}
        </p>
      )}

      {result.status === 'underspending' && (
        <p className="text-[11px] text-amber-600">
          Spending is behind schedule — risk of underspending
        </p>
      )}
    </div>
  );
}
