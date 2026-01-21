import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Settings, 
  Calendar,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { Indicator, useIndicatorTargets, useIndicatorValues } from '@/hooks/useIndicators';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface ComputedValue {
  current: { value: number; periodStart: Date; periodEnd: Date };
  previous: { value: number; periodStart: Date; periodEnd: Date };
  trendPercentage: number;
}

interface IndicatorDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator: Indicator;
  computedValue?: ComputedValue;
  onSetTarget: () => void;
  onEdit: () => void;
}

export function IndicatorDetailView({
  open,
  onOpenChange,
  indicator,
  computedValue,
  onSetTarget,
  onEdit,
}: IndicatorDetailViewProps) {
  const currentYear = new Date().getFullYear();
  const { data: targets = [] } = useIndicatorTargets(indicator.id);
  const { data: historicalValues = [] } = useIndicatorValues(indicator.id);

  const currentTarget = targets.find(t => 
    t.period_year === currentYear && 
    (t.period_type === 'yearly' || 
     (t.period_type === 'monthly' && t.period_value === new Date().getMonth() + 1) ||
     (t.period_type === 'quarterly' && t.period_value === Math.ceil((new Date().getMonth() + 1) / 3)))
  );

  const currentValue = computedValue?.current.value ?? 0;
  const trendPercentage = computedValue?.trendPercentage ?? 0;
  
  const isPositiveTrend = trendPercentage > 0;
  const isNegativeTrend = trendPercentage < 0;
  
  const isTrendGood = indicator.trend_direction === 'up_is_good' 
    ? isPositiveTrend 
    : indicator.trend_direction === 'down_is_good' 
      ? isNegativeTrend 
      : true;

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

  // Generate chart data from historical values or mock data
  const chartData = useMemo(() => {
    if (historicalValues.length > 0) {
      return historicalValues.slice(0, 12).reverse().map(v => ({
        period: format(new Date(v.period_start), 'MMM yy'),
        value: v.actual_value,
      }));
    }
    
    // Generate mock data for demo
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        period: format(date, 'MMM yy'),
        value: Math.round(currentValue * (0.7 + Math.random() * 0.6)),
      });
    }
    // Set last month to actual current value
    if (months.length > 0) {
      months[months.length - 1].value = currentValue;
    }
    return months;
  }, [historicalValues, currentValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary">{indicator.code}</Badge>
                <Badge variant="outline" className="capitalize">
                  {indicator.formula_type}
                </Badge>
              </div>
              <DialogTitle className="text-xl">{indicator.name}</DialogTitle>
              {indicator.description && (
                <DialogDescription className="mt-1">
                  {indicator.description}
                </DialogDescription>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onSetTarget}>
                <Target className="h-4 w-4 mr-1" />
                Set Target
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Settings className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Value Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Value</p>
                  <p className="text-4xl font-bold">{formatValue(currentValue)}</p>
                  {computedValue && (
                    <div className={cn(
                      'flex items-center gap-1 mt-2',
                      trendPercentage === 0 ? 'text-muted-foreground' :
                      isTrendGood ? 'text-emerald-600' : 'text-destructive'
                    )}>
                      {trendPercentage === 0 ? (
                        <Minus className="h-4 w-4" />
                      ) : isPositiveTrend ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {isPositiveTrend ? '+' : ''}{trendPercentage.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">vs previous {indicator.aggregation_period}</span>
                    </div>
                  )}
                </div>
                
                {/* Target Progress */}
                {currentTarget && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Target</p>
                    <p className="text-2xl font-semibold">{formatValue(currentTarget.target_value)}</p>
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            'h-full rounded-full',
                            (currentValue / currentTarget.target_value) >= 1 ? 'bg-emerald-500' :
                            (currentValue / currentTarget.target_value) >= 0.8 ? 'bg-accent' : 'bg-amber-500'
                          )}
                          style={{ width: `${Math.min((currentValue / currentTarget.target_value) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {((currentValue / currentTarget.target_value) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trend Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Historical Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatValue(value), indicator.name]}
                    />
                    {currentTarget && (
                      <ReferenceLine 
                        y={currentTarget.target_value} 
                        stroke="hsl(var(--accent))"
                        strokeDasharray="5 5"
                        label={{ 
                          value: 'Target', 
                          position: 'right',
                          fill: 'hsl(var(--muted-foreground))',
                          fontSize: 10,
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Formula Type</p>
                  <p className="font-medium capitalize">{indicator.formula_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aggregation</p>
                  <p className="font-medium capitalize">{indicator.aggregation_period}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unit</p>
                  <p className="font-medium capitalize">{indicator.unit}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trend Direction</p>
                  <p className="font-medium">
                    {indicator.trend_direction === 'up_is_good' ? '↑ Up is good' :
                     indicator.trend_direction === 'down_is_good' ? '↓ Down is good' : '— Neutral'}
                  </p>
                </div>
              </div>

              {/* Formula Config Preview */}
              <Separator className="my-4" />
              <div>
                <p className="text-muted-foreground text-sm mb-2">Data Source</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(indicator.formula_config, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Targets List */}
          {targets.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Targets ({targets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {targets.slice(0, 5).map((target) => (
                    <div key={target.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {target.period_type === 'yearly' ? target.period_year :
                           target.period_type === 'quarterly' ? `Q${target.period_value} ${target.period_year}` :
                           `${format(new Date(target.period_year, target.period_value - 1), 'MMM yyyy')}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {target.minimum_value && (
                          <span className="text-destructive">Min: {formatValue(target.minimum_value)}</span>
                        )}
                        <span className="font-medium">Target: {formatValue(target.target_value)}</span>
                        {target.stretch_value && (
                          <span className="text-emerald-600">Stretch: {formatValue(target.stretch_value)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
