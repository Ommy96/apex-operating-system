import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
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

// Build filters for Supabase query
function applyFilters(query: any, filters: Record<string, any>, dateField?: string, periodStart?: Date, periodEnd?: Date) {
  let q = query;
  
  // Apply regular filters
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      q = q.eq(key, value);
    }
  }
  
  // Apply date range filter
  if (dateField && periodStart && periodEnd) {
    q = q.gte(dateField, format(periodStart, 'yyyy-MM-dd'))
         .lte(dateField, format(periodEnd, 'yyyy-MM-dd'));
  }
  
  return q;
}

// Compute COUNT formula
async function computeCount(
  config: FormulaConfig,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const tableName = config.table;
  if (!tableName) return 0;
  
  // We need to handle organization scoping for each table
  let query = supabase.from(tableName as any).select('id', { count: 'exact', head: true });
  
  // Apply organization filter if the table has organization_id
  const tablesWithOrgId = ['children', 'home_visit_reports', 'school_visit_reports', 'business_visit_reports'];
  if (tablesWithOrgId.includes(tableName)) {
    query = query.eq('organization_id', organizationId);
  }
  
  // Apply filters
  query = applyFilters(query, config.filters || {}, config.date_field, config.date_range === 'current_period' ? periodStart : undefined, config.date_range === 'current_period' ? periodEnd : undefined);
  
  const { count, error } = await query;
  if (error) {
    console.error('Error computing count:', error);
    return 0;
  }
  
  return count || 0;
}

// Compute SUM formula
async function computeSum(
  config: FormulaConfig,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const tableName = config.table;
  const field = config.field;
  if (!tableName || !field) return 0;
  
  let query = supabase.from(tableName as any).select(field);
  
  // Apply organization filter
  const tablesWithOrgId = ['children', 'alumni', 'feeding_program', 'kipawa_sato', 'self_empowerment', 'support_groups'];
  if (tablesWithOrgId.includes(tableName)) {
    query = query.eq('organization_id', organizationId);
  }
  
  query = applyFilters(query, config.filters || {}, config.date_field, config.date_range === 'current_period' ? periodStart : undefined, config.date_range === 'current_period' ? periodEnd : undefined);
  
  const { data, error } = await query;
  if (error) {
    console.error('Error computing sum:', error);
    return 0;
  }
  
  const sum = (data || []).reduce((acc: number, row: any) => {
    const value = parseFloat(row[field]) || 0;
    return acc + value;
  }, 0);
  
  return sum;
}

// Compute AVERAGE formula
async function computeAverage(
  config: FormulaConfig,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const tableName = config.table;
  const field = config.field;
  if (!tableName || !field) return 0;
  
  let query = supabase.from(tableName as any).select(field);
  
  // Apply organization filter
  const tablesWithOrgId = ['children', 'alumni', 'feeding_program', 'kipawa_sato', 'self_empowerment', 'support_groups'];
  if (tablesWithOrgId.includes(tableName)) {
    query = query.eq('organization_id', organizationId);
  }
  
  query = applyFilters(query, config.filters || {}, config.date_field, config.date_range === 'current_period' ? periodStart : undefined, config.date_range === 'current_period' ? periodEnd : undefined);
  
  const { data, error } = await query;
  if (error) {
    console.error('Error computing average:', error);
    return 0;
  }
  
  if (!data || data.length === 0) return 0;
  
  const sum = data.reduce((acc: number, row: any) => {
    const value = parseFloat(row[field]) || 0;
    return acc + value;
  }, 0);
  
  return sum / data.length;
}

// Compute RATIO formula
async function computeRatio(
  config: FormulaConfig,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  if (!config.numerator || !config.denominator) return 0;
  
  const numerator = await computeCount(config.numerator, organizationId, periodStart, periodEnd);
  const denominator = await computeCount(config.denominator, organizationId, periodStart, periodEnd);
  
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// Compute PERCENTAGE formula
async function computePercentage(
  config: FormulaConfig,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const ratio = await computeRatio(config, organizationId, periodStart, periodEnd);
  return ratio * 100;
}

// Main computation function
export async function computeIndicatorValue(
  indicator: Indicator,
  organizationId: string,
  date: Date = new Date()
): Promise<ComputationResult> {
  const { start, end } = getPeriodBoundaries(indicator.aggregation_period, date);
  const config = indicator.formula_config as FormulaConfig;
  
  let value = 0;
  
  switch (indicator.formula_type) {
    case 'count':
      value = await computeCount(config, organizationId, start, end);
      break;
    case 'sum':
      value = await computeSum(config, organizationId, start, end);
      break;
    case 'average':
      value = await computeAverage(config, organizationId, start, end);
      break;
    case 'ratio':
      value = await computeRatio(config, organizationId, start, end);
      break;
    case 'percentage':
      value = await computePercentage(config, organizationId, start, end);
      break;
    default:
      console.warn(`Unknown formula type: ${indicator.formula_type}`);
  }
  
  // Round to specified decimal places
  value = Number(value.toFixed(indicator.decimal_places));
  
  return {
    value,
    periodStart: start,
    periodEnd: end,
  };
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
        results.set(indicator.id, {
          current: { value: 0, periodStart: new Date(), periodEnd: new Date() },
          previous: { value: 0, periodStart: new Date(), periodEnd: new Date() },
          trendPercentage: 0,
        });
      }
    })
  );
  
  return results;
}
