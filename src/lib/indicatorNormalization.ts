/**
 * Indicator translation helpers.
 *
 * Converts a raw project-level value (numeric score, grade letter, 5-point
 * scale, binary flag, …) into the program-level normalized scale defined on
 * a `program_rollup_indicator`.
 *
 * Returns `null` for any value that cannot be mapped (missing/blank/invalid).
 */

export type NormalizedScale =
  | 'percentage_0_100'
  | 'count'
  | 'scale_5'
  | 'binary';

export type SourceType =
  | 'numeric'
  | 'percentage'
  | 'grade_letter'
  | 'scale_5'
  | 'binary';

export type LinearMapping = {
  type: 'linear';
  from: [number, number];
  to?: [number, number];
};

export type Mapping = Record<string, number> | LinearMapping | null | undefined;

function clampToScale(value: number, scale: NormalizedScale): number {
  switch (scale) {
    case 'percentage_0_100':
      return Math.max(0, Math.min(100, value));
    case 'scale_5':
      return Math.max(1, Math.min(5, value));
    case 'binary':
      return value >= 0.5 ? 1 : 0;
    case 'count':
    default:
      return Math.max(0, value);
  }
}

function toScaleFromPercentage(pct: number, scale: NormalizedScale): number {
  const p = Math.max(0, Math.min(100, pct));
  switch (scale) {
    case 'percentage_0_100':
      return p;
    case 'scale_5':
      // 0..100 → 1..5
      return 1 + (p / 100) * 4;
    case 'binary':
      return p >= 50 ? 1 : 0;
    case 'count':
      return p;
  }
}

function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

function isLinear(mapping: Mapping): mapping is LinearMapping {
  return (
    !!mapping &&
    typeof mapping === 'object' &&
    (mapping as any).type === 'linear' &&
    Array.isArray((mapping as any).from)
  );
}

function linearScale(value: number, m: LinearMapping): number {
  const [a, b] = m.from;
  const [c, d] = m.to ?? [0, 100];
  if (b === a) return c;
  const t = (value - a) / (b - a);
  return c + t * (d - c);
}

export function normalizeValue(
  rawValue: unknown,
  sourceType: SourceType,
  mapping: Mapping,
  normalizedScale: NormalizedScale,
): number | null {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;

  switch (sourceType) {
    case 'percentage': {
      const n = parseNumber(rawValue);
      if (n === null) return null;
      return clampToScale(toScaleFromPercentage(n, normalizedScale), normalizedScale);
    }

    case 'numeric': {
      const n = parseNumber(rawValue);
      if (n === null) return null;
      // Prefer explicit linear mapping
      if (isLinear(mapping)) {
        const pct = linearScale(n, { ...mapping, to: mapping.to ?? [0, 100] });
        return clampToScale(toScaleFromPercentage(pct, normalizedScale), normalizedScale);
      }
      // No mapping → pass through count, otherwise treat as percentage
      if (normalizedScale === 'count') return clampToScale(n, 'count');
      return clampToScale(toScaleFromPercentage(n, normalizedScale), normalizedScale);
    }

    case 'grade_letter': {
      const key = String(rawValue).trim().toUpperCase();
      if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) return null;
      const dict = mapping as Record<string, number>;
      const v = dict[key];
      if (v === undefined || v === null || !Number.isFinite(Number(v))) return null;
      return clampToScale(toScaleFromPercentage(Number(v), normalizedScale), normalizedScale);
    }

    case 'scale_5': {
      const n = parseNumber(rawValue);
      if (n === null) return null;
      // Optional explicit per-step mapping to percent (e.g. {"1":20,...,"5":100})
      if (mapping && typeof mapping === 'object' && !Array.isArray(mapping) && !isLinear(mapping)) {
        const dict = mapping as Record<string, number>;
        const v = dict[String(Math.round(n))];
        if (v !== undefined && Number.isFinite(Number(v))) {
          return clampToScale(toScaleFromPercentage(Number(v), normalizedScale), normalizedScale);
        }
      }
      // Default: 1..5 → 0..100
      const pct = ((Math.max(1, Math.min(5, n)) - 1) / 4) * 100;
      return clampToScale(toScaleFromPercentage(pct, normalizedScale), normalizedScale);
    }

    case 'binary': {
      const s = String(rawValue).trim().toLowerCase();
      const truthy = ['1', 'true', 'yes', 'y', 'pass', 'met'];
      const falsy = ['0', 'false', 'no', 'n', 'fail', 'not_met'];
      let b: 0 | 1 | null = null;
      if (truthy.includes(s)) b = 1;
      else if (falsy.includes(s)) b = 0;
      else {
        const n = parseNumber(rawValue);
        if (n === null) return null;
        b = n >= 0.5 ? 1 : 0;
      }
      return clampToScale(toScaleFromPercentage(b * 100, normalizedScale), normalizedScale);
    }
  }

  return null;
}

/**
 * Weighted average aggregator. Returns `null` when no valid contributions.
 */
export function aggregateNormalized(
  contributions: Array<{ value: number | null; weight?: number }>,
): number | null {
  const valid = contributions.filter(
    (c) => c.value !== null && Number.isFinite(c.value as number),
  );
  if (valid.length === 0) return null;
  let totalWeight = 0;
  let sum = 0;
  for (const c of valid) {
    const w = c.weight && c.weight > 0 ? c.weight : 1;
    totalWeight += w;
    sum += (c.value as number) * w;
  }
  return totalWeight > 0 ? sum / totalWeight : null;
}