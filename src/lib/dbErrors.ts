import { logger } from '@/lib/logger';

/** Human-readable label for each linked-record bucket. */
export const LINK_LABELS: Record<string, [string, string]> = {
  enrollments: ['programme enrolment', 'programme enrolments'],
  needs: ['recorded need', 'recorded needs'],
  guardians: ['guardian link', 'guardian links'],
  sponsorships: ['sponsorship', 'sponsorships'],
  allocations: ['funding allocation', 'funding allocations'],
  visits: ['visit', 'visits'],
  documents: ['document', 'documents'],
  timeline: ['timeline entry', 'timeline entries'],
};

export type LinkCounts = Record<string, number> & { total?: number };

/** "2 sponsorships, 1 visit and 3 documents" */
export function describeLinks(counts: LinkCounts | null | undefined): string {
  if (!counts) return 'no linked records';
  const parts = Object.entries(LINK_LABELS)
    .filter(([k]) => (counts[k] || 0) > 0)
    .map(([k, [one, many]]) => `${counts[k]} ${counts[k] === 1 ? one : many}`);
  if (parts.length === 0) return 'no linked records';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * Translate a Postgres/PostgREST error into something a person can act on.
 * The raw error is always logged for debugging; it is never shown to the user.
 */
export function humanizeDbError(
  error: any,
  context: { entity?: string; action?: string } = {},
): string {
  const entity = context.entity || 'record';
  logger.error(`DB error while trying to ${context.action || 'update'} ${entity}:`, error);

  const code = error?.code;
  const raw = String(error?.message || '');

  if (code === '23503' || /foreign key constraint/i.test(raw)) {
    return `This ${entity} still has linked history (enrolments, sponsorships, needs, visits or documents) and cannot be deleted directly — archive it instead so the history is preserved.`;
  }
  if (code === '23505' || /duplicate key/i.test(raw)) {
    return `A ${entity} with these details already exists.`;
  }
  if (code === '42501' || /permission denied|not authorised|row-level security/i.test(raw)) {
    return `You do not have permission to do this. Ask an organisation administrator.`;
  }
  if (/Only an organisation administrator/i.test(raw)) {
    return 'Only an organisation administrator can permanently erase a record.';
  }
  if (/Record not found/i.test(raw)) {
    return `That ${entity} no longer exists — it may already have been removed.`;
  }
  if (/Failed to fetch|NetworkError/i.test(raw)) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return `Could not ${context.action || 'complete that action'}. Please try again, or contact support if it keeps happening.`;
}
