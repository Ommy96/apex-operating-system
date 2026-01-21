import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Target, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Indicator, IndicatorTarget } from '@/hooks/useIndicators';

interface IndicatorCardProps {
  indicator: Indicator;
  currentValue: number;
  previousValue?: number;
  target?: IndicatorTarget;
  trendPercentage?: number;
  onClick?: () => void;
  className?: string;
}

export function IndicatorCard({
  indicator,
  currentValue,
  previousValue,
  target,
  trendPercentage = 0,
  onClick,
  className,
}: IndicatorCardProps) {
  // Determine trend direction
  const isPositiveTrend = trendPercentage > 0;
  const isNegativeTrend = trendPercentage < 0;
  const isNeutralTrend = trendPercentage === 0;
  
  // Check if trend is "good" based on indicator settings
  const isTrendGood = indicator.trend_direction === 'up_is_good'
    ? isPositiveTrend 
    : indicator.trend_direction === 'down_is_good' 
      ? isNegativeTrend 
      : true;

  // Calculate progress towards target
  const targetProgress = target ? (currentValue / target.target_value) * 100 : null;
  const isOnTrack = targetProgress !== null ? targetProgress >= 80 : null;
  const isBelowMinimum = target?.minimum_value && currentValue < target.minimum_value;
  const isAboveStretch = target?.stretch_value && currentValue >= target.stretch_value;

  // Format value based on unit
  const formatValue = (value: number) => {
    if (indicator.unit === 'percentage') {
      return `${value.toFixed(indicator.decimal_places)}%`;
    }
    if (indicator.unit === 'currency') {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString('en-US', {
      minimumFractionDigits: indicator.decimal_places,
      maximumFractionDigits: indicator.decimal_places,
    });
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <Badge variant="secondary" className="mb-2 text-xs font-medium">
              {indicator.code}
            </Badge>
            <h3 className="text-sm font-medium text-foreground truncate">
              {indicator.name}
            </h3>
          </div>
          
          {/* Target status indicator */}
          {target && (
            <div className="flex-shrink-0 ml-2">
              {isAboveStretch ? (
                <div className="flex items-center gap-1 text-success">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Exceeded</span>
                </div>
              ) : isBelowMinimum ? (
                <div className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Below Min</span>
                </div>
              ) : isOnTrack ? (
                <div className="flex items-center gap-1 text-success">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">On Track</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-600">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Behind</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-3">
          <span className="text-3xl font-bold text-foreground">
            {formatValue(currentValue)}
          </span>
        </div>

        {/* Trend */}
        {indicator.show_trend && (
          <div className="flex items-center gap-2">
            {isNeutralTrend ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Minus className="h-4 w-4" />
                <span className="text-sm">No change</span>
              </div>
            ) : (
              <div className={cn(
                'flex items-center gap-1',
                isTrendGood ? 'text-success' : 'text-destructive'
              )}>
                {isPositiveTrend ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {isPositiveTrend ? '+' : ''}{trendPercentage.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  vs last period
                </span>
              </div>
            )}
          </div>
        )}

        {/* Target progress bar */}
        {target && targetProgress !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress to target</span>
              <span>{Math.min(targetProgress, 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isBelowMinimum ? 'bg-destructive' :
                  isAboveStretch ? 'bg-success' :
                  isOnTrack ? 'bg-accent' : 'bg-warning'
                )}
                style={{ width: `${Math.min(targetProgress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>Current: {formatValue(currentValue)}</span>
              <span>Target: {formatValue(target.target_value)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
