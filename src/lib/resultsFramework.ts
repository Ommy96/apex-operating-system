export const OUTCOME_EVIDENCE_WARNING = 'Enrollment, attendance, disbursement and task completion are outputs or activities — never evidence of outcomes.';
export type IndicatorDirection = 'up_is_good' | 'down_is_good' | 'neutral';
export function achievementPercentage(actual: number | null | undefined, target: number | null | undefined, direction: string = 'up_is_good', denominator: number | null = 1): number | null {
  if (actual == null || target == null || !Number.isFinite(actual) || !Number.isFinite(target) || actual < 0 || target <= 0 || denominator == null || !Number.isFinite(denominator) || denominator <= 0) return null;
  if (direction === 'down_is_good') return actual === 0 ? null : target / actual * 100;
  return actual / target * 100;
}
export function classifyAchievement(percent: number | null) {
  return percent == null ? 'no_data' : percent >= 80 ? 'on_track' : percent >= 50 ? 'at_risk' : 'off_track';
}
export function distinctBeneficiaryCount(rows: Array<{ id?: string; beneficiary_id?: string }>): number {
  return new Set(rows.map(r => r.beneficiary_id ?? r.id).filter(Boolean)).size;
}
export interface ResultMeasurement {
  id: string; name: string; definition: string | null; baseline: number | null; target: number | null;
  current: number | null; numerator: number | null; denominator: number | null; direction: string;
  level: string | null; unit: string; period_start: string; period_end: string; limitations: string;
  calculation_method: string | null; percent?: number | null; donor_shareable: boolean; program_ids?: string[];
}
export function resultExportRow(result: ResultMeasurement) {
  return { ...result, percent: Object.prototype.hasOwnProperty.call(result, 'percent') ? result.percent : achievementPercentage(result.current, result.target, result.direction, result.denominator) };
}