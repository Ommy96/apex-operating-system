import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Settings, 
  Calendar,
  BarChart3,
  ChevronDown,
  Plus,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { Indicator, useIndicatorTargets, useIndicatorValues } from '@/hooks/useIndicators';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';
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
  BarChart,
  Bar,
  Legend,
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

const RULE_LABELS: Record<string, string> = {
  min_value: 'Minimum value',
  max_value: 'Maximum value',
  max_change_pct: 'Max % change between periods',
  require_comment_if_zero: 'Require comment when zero',
};

const DISAGG_COLORS = ['#14b8a6', '#a855f7', '#f59e0b', '#3b82f6', '#ef4444', '#6366f1'];

export function IndicatorDetailView({
  open,
  onOpenChange,
  indicator,
  computedValue,
  onSetTarget,
  onEdit,
}: IndicatorDetailViewProps) {
  const currentYear = new Date().getFullYear();
  const queryClient = useQueryClient();
  const { data: targets = [] } = useIndicatorTargets(indicator.id);
  const { data: historicalValues = [] } = useIndicatorValues(indicator.id);

  // Validation rules
  const { data: validationRules = [] } = useQuery({
    queryKey: ['indicator-validation-rules', indicator.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('indicator_validation_rules')
        .select('*')
        .eq('indicator_id', indicator.id);
      return data || [];
    },
    enabled: !!indicator.id,
  });

  const [newRuleType, setNewRuleType] = useState('min_value');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);

  const addRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('indicator_validation_rules').insert({
        indicator_id: indicator.id,
        rule_type: newRuleType,
        rule_value: newRuleType === 'require_comment_if_zero' ? 0 : parseFloat(newRuleValue),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicator-validation-rules', indicator.id] });
      setNewRuleValue('');
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from('indicator_validation_rules').delete().eq('id', ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicator-validation-rules', indicator.id] });
    },
  });

  // Disaggregated data
  const disaggregatedValues = useMemo(() => {
    return historicalValues.filter((v: any) => v.disaggregation_value != null && v.disaggregation_category_id != null);
  }, [historicalValues]);

  const hasDisaggregation = disaggregatedValues.length > 0;

  // Get available periods for disaggregated view
  const disaggPeriods = useMemo(() => {
    const periods = new Set<string>();
    disaggregatedValues.forEach((v: any) => periods.add(v.period_start));
    return Array.from(periods).sort().reverse();
  }, [disaggregatedValues]);

  const [selectedDisaggPeriod, setSelectedDisaggPeriod] = useState<string>('');
  const activePeriod = selectedDisaggPeriod || disaggPeriods[0] || '';

  const disaggChartData = useMemo(() => {
    if (!activePeriod) return [];
    return disaggregatedValues
      .filter((v: any) => v.period_start === activePeriod)
      .map((v: any) => ({
        name: v.disaggregation_value,
        value: v.actual_value,
      }));
  }, [disaggregatedValues, activePeriod]);

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

  const chartData = useMemo(() => {
    if (historicalValues.length > 0) {
      return historicalValues
        .filter((v: any) => !v.disaggregation_value)
        .slice(0, 12).reverse().map((v: any) => ({
          period: format(new Date(v.period_start), 'MMM yy'),
          value: v.actual_value,
        }));
    }
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        period: format(date, 'MMM yy'),
        value: Math.round(currentValue * (0.7 + Math.random() * 0.6)),
      });
    }
    if (months.length > 0) months[months.length - 1].value = currentValue;
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
                      isTrendGood ? 'text-success' : 'text-destructive'
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
                
                {currentTarget && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Target</p>
                    <p className="text-2xl font-semibold">{formatValue(currentTarget.target_value)}</p>
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            'h-full rounded-full',
                            (currentValue / currentTarget.target_value) >= 1 ? 'bg-success' :
                            (currentValue / currentTarget.target_value) >= 0.8 ? 'bg-accent' : 'bg-warning'
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
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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
                        label={{ value: 'Target', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      />
                    )}
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Disaggregated View */}
          {hasDisaggregation && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Disaggregated View
                  </CardTitle>
                  {disaggPeriods.length > 1 && (
                    <Select value={activePeriod} onValueChange={setSelectedDisaggPeriod}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {disaggPeriods.map(p => (
                          <SelectItem key={p} value={p}>{format(new Date(p), 'MMM yyyy')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={disaggChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

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

              <Separator className="my-4" />
              <div>
                <p className="text-muted-foreground text-sm mb-2">Data Source</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(indicator.formula_config, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Validation Rules */}
          <Collapsible open={rulesOpen} onOpenChange={setRulesOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Validation Rules ({validationRules.length})
                    <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", rulesOpen && "rotate-180")} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {validationRules.length > 0 && (
                    <div className="space-y-2">
                      {validationRules.map((rule: any) => (
                        <div key={rule.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{RULE_LABELS[rule.rule_type] || rule.rule_type}</Badge>
                            {rule.rule_type !== 'require_comment_if_zero' && (
                              <span className="font-mono text-xs">{rule.rule_value}</span>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRule.mutate(rule.id)} aria-label="Delete rule">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Select value={newRuleType} onValueChange={setNewRuleType}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="min_value">Minimum value</SelectItem>
                          <SelectItem value="max_value">Maximum value</SelectItem>
                          <SelectItem value="max_change_pct">Max % change</SelectItem>
                          <SelectItem value="require_comment_if_zero">Require comment if zero</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newRuleType !== 'require_comment_if_zero' && (
                      <Input
                        type="number"
                        value={newRuleValue}
                        onChange={e => setNewRuleValue(e.target.value)}
                        placeholder="Value"
                        className="w-24 h-8 text-xs"
                      />
                    )}
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => addRule.mutate()}
                      disabled={addRule.isPending || (newRuleType !== 'require_comment_if_zero' && !newRuleValue)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

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
                          <span className="text-success">Stretch: {formatValue(target.stretch_value)}</span>
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
