import { supabase } from '@/integrations/supabase/client';
import { Indicator } from '@/hooks/useIndicators';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, format } from 'date-fns';

interface FormulaConfig {
  table?: string;
  field?: string;
  filters?: Record<string, any>;
  date_field?: string;
  date_range?: string;
  numerator?: FormulaConfig;
  denominator?: FormulaConfig;
}

interface ComputationResult {
  value: number;
  periodStart: Date;
  periodEnd: Date;
}

// Get period boundaries based on aggregation period
export function getPeriodBoundaries(aggregationPeriod: string, date: Date = new Date()): { start: Date; end: Date } {
  switch (aggregationPeriod) {
    case 'monthly':
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case 'quarterly':
      return { start: startOfQuarter(date), end: endOfQuarter(date) };
    case 'yearly':
      return { start: startOfYear(date), end: endOfYear(date) };
    default:
      return { start: startOfMonth(date), end: endOfMonth(date) };
  }
}

// Get previous period for comparison
export function getPreviousPeriod(aggregationPeriod: string, date: Date = new Date()): { start: Date; end: Date } {
  switch (aggregationPeriod) {
    case 'monthly':
      return getPeriodBoundaries(aggregationPeriod, subMonths(date, 1));
    case 'quarterly':
      return getPeriodBoundaries(aggregationPeriod, subQuarters(date, 1));
    case 'yearly':
      return getPeriodBoundaries(aggregationPeriod, subYears(date, 1));
    default:
      return getPeriodBoundaries(aggregationPeriod, subMonths(date, 1));
  }
}

// All automation uses the permission-checked current indicator data layer.
export async function computeIndicatorValue(indicator: Indicator, organizationId: string, date: Date = new Date()): Promise<ComputationResult> {
  if (indicator.organization_id !== organizationId) throw new Error('Organisation mismatch');
  const { start, end } = getPeriodBoundaries(indicator.aggregation_period, date);
  const { data, error } = await (supabase as any).rpc('compute_results_indicator', { _indicator: indicator.id, _start: format(start, 'yyyy-MM-dd'), _end: format(end, 'yyyy-MM-dd') });
  if (error) throw error;
  if (data?.current == null) throw new Error('Measurement unavailable');
  return { value: Number(data.current), periodStart: start, periodEnd: end };
}

// Compute and compare with previous period
export async function computeIndicatorWithTrend(
  indicator: Indicator,
  organizationId: string,
  date: Date = new Date()
): Promise<{
  current: ComputationResult;
  previous: ComputationResult;
  trendPercentage: number;
}> {
  const current = await computeIndicatorValue(indicator, organizationId, date);
  
  const { start: prevStart } = getPreviousPeriod(indicator.aggregation_period, date);
  const previous = await computeIndicatorValue(indicator, organizationId, prevStart);
  
  let trendPercentage = 0;
  if (previous.value !== 0) {
    trendPercentage = ((current.value - previous.value) / previous.value) * 100;
  } else if (current.value > 0) {
    trendPercentage = 100; // New growth from 0
  }
  
  return {
    current,
    previous,
    trendPercentage: Number(trendPercentage.toFixed(1)),
  };
}

// Compute all indicators for an organization
export async function computeAllIndicators(
  indicators: Indicator[],
  organizationId: string,
  date: Date = new Date()
): Promise<Map<string, { current: ComputationResult; previous: ComputationResult; trendPercentage: number }>> {
  const results = new Map();
  
  await Promise.all(
    indicators.map(async (indicator) => {
      try {
        const result = await computeIndicatorWithTrend(indicator, organizationId, date);
        results.set(indicator.id, result);
      } catch (error) {
        console.error(`Error computing indicator ${indicator.code}:`, error);

      }
    })
  );
  
  return results;
}
