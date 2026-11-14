export const REPORT_SCOPE = { PROGRAM: 'program', PROJECT: 'project' } as const;
export const REPORT_CADENCE = { WEEKLY: 'weekly', FORTNIGHTLY: 'fortnightly', MONTHLY: 'monthly', QUARTERLY: 'quarterly' } as const;
export const REPORT_STATUS = { SUBMITTED: 'submitted', PENDING: 'pending', OVERDUE: 'overdue' } as const;
export const REPORT_FILTER_ALL = 'all';
export const reportMatches = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export interface LedgerCell {
  obligation_id: string; user_id: string; staff_name: string; scope_type: string;
  program_id: string | null; project_id: string | null; program_name: string | null;
  scope_name: string; form_name: string; cadence: string; grace_days: number;
  period_start: string; period_end: string; status: string; last_nudged_at: string | null;
}
export function reportingRollup(cells: LedgerCell[]) {
  const met = new Set(cells.filter(c => reportMatches(c.status, REPORT_STATUS.SUBMITTED)).map(c => c.obligation_id));
  const all = new Set(cells.map(c => c.obligation_id));
  return { submitted: met.size, total: all.size, percentage: all.size ? Math.round(met.size / all.size * 100) : null };
}