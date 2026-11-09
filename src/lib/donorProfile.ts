/** Shared, case-normalised values used by the donor sponsored-beneficiary profile. */
export const NEED_STATUS = { MET: 'met', PARTIALLY_MET: 'partially_met', UNMET: 'unmet' } as const;
export const CORRESPONDENCE_STATUS = { APPROVED: 'approved', PENDING_REVIEW: 'pending_review' } as const;
export const DONOR_REQUEST_KIND = { UPDATE: 'update', VISIT_REPORT: 'visit_report' } as const;
export const CORRESPONDENCE_KIND_LETTER = 'message';

/** Signed URL lifetime for donor-facing portraits and update images. */
export const DONOR_IMAGE_TTL_SECONDS = 300;

export const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
export const isStatus = (v: unknown, expected: string) => norm(v) === norm(expected);

export function needStatusLabel(status: unknown): { label: string; tone: 'met' | 'partial' | 'unmet' | 'unknown' } {
  if (isStatus(status, NEED_STATUS.MET)) return { label: 'Fully funded', tone: 'met' };
  if (isStatus(status, NEED_STATUS.PARTIALLY_MET)) return { label: 'Partly funded', tone: 'partial' };
  if (isStatus(status, NEED_STATUS.UNMET)) return { label: 'Still open', tone: 'unmet' };
  return { label: 'Status not recorded', tone: 'unknown' };
}

/** Whole years between two dates, or null when the start is unknown. */
export function yearsSince(start?: string | null, now = new Date()): number | null {
  if (!start) return null;
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return null;
  let y = now.getFullYear() - s.getFullYear();
  if (now.getMonth() < s.getMonth() || (now.getMonth() === s.getMonth() && now.getDate() < s.getDate())) y--;
  return Math.max(0, y);
}

/**
 * Grade change since sponsorship start, computed only from recorded progression.
 * Returns null when it cannot be computed — never inferred.
 */
export function gradeChangeSince(
  start: string | null | undefined,
  currentGrade: string | null | undefined,
  progression: { progression_date: string; previous_grade?: string | null }[],
): { from: string; to: string } | null {
  if (!start || !currentGrade) return null;
  const after = progression
    .filter((p) => p.progression_date && new Date(p.progression_date) >= new Date(start) && p.previous_grade)
    .sort((a, b) => new Date(a.progression_date).getTime() - new Date(b.progression_date).getTime());
  const from = after[0]?.previous_grade;
  if (!from || norm(from) === norm(currentGrade)) return null;
  return { from, to: currentGrade };
}
