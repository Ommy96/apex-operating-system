/**
 * Lightweight client-side forecasting utilities.
 *
 * Used by the Analytics & Reporting Center "Forecasting" tab to project
 * future values from historical Supabase data. No external ML libraries.
 *
 * Methods:
 *  - forecastLinear: simple least-squares linear regression projection
 *  - movingAverage: rolling N-period average smoothing
 *  - growthRate: percentage change between two values
 *  - cagr: compound annual growth rate over N periods
 *  - monthsToTarget: at current linear trend, how many periods until target?
 */

/** Round helper: keeps forecast values as integers where appropriate. */
const r = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0);

/**
 * Linear regression forecast.
 * @param dataPoints historical values, oldest -> newest
 * @param periodsAhead number of future periods to project
 * @returns array of length `periodsAhead` containing projected values
 *
 * Uses least-squares: fits y = mx + b to historical data, then evaluates
 * at x = n+1, n+2, ..., n+periodsAhead. Negative projections are clamped to 0.
 */
export function forecastLinear(
  dataPoints: number[],
  periodsAhead: number
): number[] {
  if (!Array.isArray(dataPoints) || dataPoints.length === 0 || periodsAhead <= 0) {
    return [];
  }

  // With a single data point we have no slope - project flat line
  if (dataPoints.length === 1) {
    return Array.from({ length: periodsAhead }, () => r(dataPoints[0]));
  }

  const n = dataPoints.length;
  // Use 0-indexed x values
  const sumX = (n * (n - 1)) / 2;
  const sumY = dataPoints.reduce((acc, v) => acc + v, 0);
  const sumXY = dataPoints.reduce((acc, y, x) => acc + x * y, 0);
  const sumXX = dataPoints.reduce((acc, _y, x) => acc + x * x, 0);

  const denominator = n * sumXX - sumX * sumX;
  // If all x are identical (impossible here for n>=2) or perfectly flat
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const out: number[] = [];
  for (let i = 1; i <= periodsAhead; i++) {
    const projected = intercept + slope * (n - 1 + i);
    out.push(r(Math.max(0, projected)));
  }
  return out;
}

/**
 * Simple moving average smoothing.
 * @param dataPoints historical values
 * @param window number of periods to average
 * @returns array of same length; first `window-1` entries are null (insufficient data)
 */
export function movingAverage(
  dataPoints: number[],
  window: number
): (number | null)[] {
  if (!Array.isArray(dataPoints) || window <= 0) return [];
  return dataPoints.map((_, i) => {
    if (i < window - 1) return null;
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += dataPoints[j];
    return Math.round((sum / window) * 100) / 100;
  });
}

/**
 * Percentage growth rate between two values.
 * @returns rounded to 1 decimal place; 0 if previous is 0/invalid.
 */
export function growthRate(current: number, previous: number): number {
  if (!previous || !Number.isFinite(previous)) return 0;
  const rate = ((current - previous) / Math.abs(previous)) * 100;
  return Math.round(rate * 10) / 10;
}

/**
 * Average period-over-period growth rate across a series.
 * Useful for headlines like "growing X% per month on average".
 */
export function averageGrowthRate(dataPoints: number[]): number {
  if (!Array.isArray(dataPoints) || dataPoints.length < 2) return 0;
  const rates: number[] = [];
  for (let i = 1; i < dataPoints.length; i++) {
    if (dataPoints[i - 1] > 0) {
      rates.push(((dataPoints[i] - dataPoints[i - 1]) / dataPoints[i - 1]) * 100);
    }
  }
  if (rates.length === 0) return 0;
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  return Math.round(avg * 10) / 10;
}

/**
 * At the linear-trend rate of `dataPoints`, how many additional periods
 * until the projection reaches `target`?
 *
 * @returns positive integer of periods, or null if target is unreachable
 *          within `maxPeriods` (default 120) or already reached.
 */
export function periodsToTarget(
  dataPoints: number[],
  target: number,
  maxPeriods: number = 120
): number | null {
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) return null;
  const last = dataPoints[dataPoints.length - 1];
  if (last >= target) return 0;

  const projected = forecastLinear(dataPoints, maxPeriods);
  for (let i = 0; i < projected.length; i++) {
    if (projected[i] >= target) return i + 1;
  }
  return null;
}

/**
 * Combine actuals + forecast into a single chart-ready series.
 * Each row exposes `actual` and `forecast` keys so Recharts can render
 * two overlapping lines with one shared X axis.
 */
export function buildForecastSeries<T extends { label: string }>(
  historical: Array<T & { value: number }>,
  forecastPeriods: number,
  labelFor: (offset: number) => string
): Array<{ label: string; actual: number | null; forecast: number | null }> {
  const values = historical.map((h) => h.value);
  const projected = forecastLinear(values, forecastPeriods);

  const series: Array<{ label: string; actual: number | null; forecast: number | null }> = [];
  historical.forEach((h, i) => {
    series.push({
      label: h.label,
      actual: h.value,
      // Bridge the gap on the last actual point so the dashed line connects
      forecast: i === historical.length - 1 ? h.value : null,
    });
  });
  projected.forEach((value, i) => {
    series.push({
      label: labelFor(i + 1),
      actual: null,
      forecast: value,
    });
  });
  return series;
}
