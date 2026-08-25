/**
 * Beneficiary lifecycle — the single source of truth for stage semantics.
 *
 *  applicant     — captured but not yet assessed
 *  waiting_list  — assessed, waiting for a place / sponsor
 *  active        — currently enrolled and receiving support
 *  paused        — temporarily suspended, expected to return
 *  alumni        — completed the programme successfully
 *  exited        — left for other reasons
 *  archived      — record retired from active lists
 */
export const LIFECYCLE_STAGES = [
  'applicant',
  'waiting_list',
  'active',
  'paused',
  'alumni',
  'exited',
  'archived',
] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  applicant: 'Applicant',
  waiting_list: 'Waiting list',
  active: 'Active',
  paused: 'Paused',
  alumni: 'Alumni',
  exited: 'Exited',
  archived: 'Archived',
};

export const LIFECYCLE_DESCRIPTIONS: Record<LifecycleStage, string> = {
  applicant: 'Captured but not yet assessed for enrollment.',
  waiting_list: 'Assessed and waiting for a place or a sponsor.',
  active: 'Currently enrolled and receiving support.',
  paused: 'Temporarily suspended (illness, relocation, family) — expected to return.',
  alumni: 'Completed the programme successfully.',
  exited: 'Left for other reasons (dropped out, relocated away, withdrawn, deceased).',
  archived: 'Record retired from active lists.',
};

/** Badge variant hints (semantic tokens only). */
export const LIFECYCLE_VARIANT: Record<LifecycleStage, 'success' | 'warning' | 'info' | 'neutral' | 'destructive'> = {
  applicant: 'info',
  waiting_list: 'warning',
  active: 'success',
  paused: 'warning',
  alumni: 'info',
  exited: 'neutral',
  archived: 'neutral',
};

export const normaliseStage = (s: string | null | undefined): LifecycleStage => {
  const n = (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, '_');
  return (LIFECYCLE_STAGES as readonly string[]).includes(n) ? (n as LifecycleStage) : 'active';
};

export const isAlumni = (s: string | null | undefined) => normaliseStage(s) === 'alumni';
export const isActiveStage = (s: string | null | undefined) => normaliseStage(s) === 'active';

/** Alumni outcomes — where a graduate landed. */
export const ALUMNI_OUTCOMES = [
  { value: 'completed_secondary', label: 'Completed secondary' },
  { value: 'joined_tertiary', label: 'Joined university / tertiary' },
  { value: 'employed', label: 'Employed' },
  { value: 'started_business', label: 'Started a business' },
  { value: 'vocational_training', label: 'Vocational training' },
  { value: 'other', label: 'Other' },
] as const;

export const alumniOutcomeLabel = (v: string | null | undefined) =>
  ALUMNI_OUTCOMES.find(o => o.value === v)?.label ?? (v ? v.replace(/_/g, ' ') : '—');

/* ------------------------------------------------------------------ */
/* Waiting-list ranking                                                */
/* ------------------------------------------------------------------ */

export type RankingBasis =
  | 'combined'
  | 'vulnerability'
  | 'unmet_value'
  | 'urgent_needs'
  | 'waiting_time';

export const RANKING_BASES: { value: RankingBasis; label: string; help: string }[] = [
  { value: 'combined', label: 'Combined priority', help: 'Vulnerability blended with how long they have waited' },
  { value: 'vulnerability', label: 'Vulnerability score', help: 'Eligibility engine score, highest first' },
  { value: 'unmet_value', label: 'Total unmet need (KES)', help: 'Largest unfunded need value first' },
  { value: 'urgent_needs', label: 'Urgent / high-priority needs', help: 'Most urgent needs first' },
  { value: 'waiting_time', label: 'Time waiting', help: 'Longest waiting first' },
];

export interface RankableApplicant {
  vulnerability_score?: number | null;
  applied_at?: string | null;
  needs?: Array<{ priority?: string | null; estimated_cost?: number | null }> | null;
}

export const daysWaiting = (appliedAt: string | null | undefined): number => {
  if (!appliedAt) return 0;
  const ms = Date.now() - new Date(appliedAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
};

export const unmetNeedValue = (a: RankableApplicant): number =>
  (a.needs || []).reduce((s, n) => s + Number(n?.estimated_cost || 0), 0);

export const urgentNeedCount = (a: RankableApplicant): number =>
  (a.needs || []).filter(n => ['urgent', 'high'].includes((n?.priority || '').toLowerCase())).length;

/**
 * Combined priority: vulnerability (capped at 100) plus a waiting-time
 * component that grows towards a +40 ceiling over ~18 months, so a
 * moderately vulnerable applicant who has waited 14 months rises above
 * a slightly more vulnerable one who applied last week.
 */
export const combinedPriority = (a: RankableApplicant): number => {
  const vuln = Math.min(100, Number(a.vulnerability_score || 0));
  const waitScore = Math.min(40, (daysWaiting(a.applied_at) / 540) * 40);
  const urgency = Math.min(15, urgentNeedCount(a) * 5);
  return Math.round(vuln + waitScore + urgency);
};

export const rankValue = (a: RankableApplicant, basis: RankingBasis): number => {
  switch (basis) {
    case 'vulnerability': return Number(a.vulnerability_score || 0);
    case 'unmet_value': return unmetNeedValue(a);
    case 'urgent_needs': return urgentNeedCount(a);
    case 'waiting_time': return daysWaiting(a.applied_at);
    default: return combinedPriority(a);
  }
};

export function rankApplicants<T extends RankableApplicant>(rows: T[], basis: RankingBasis): T[] {
  return [...rows].sort((a, b) => rankValue(b, basis) - rankValue(a, basis));
}
