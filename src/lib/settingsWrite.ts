/**
 * Settings writes must prove they changed a row.
 *
 * Row-level security silently filters an UPDATE the caller isn't allowed to make:
 * Postgres returns success with 0 rows affected and NO error. Without this check
 * the UI shows "Saved", then the next refetch shows the old value ("settings revert").
 * Every settings mutation therefore appends `.select('id')` and passes the result here.
 */
export const NO_PERMISSION_MESSAGE =
  "wasn't saved — your role can't change organisation settings. Ask an organisation admin or owner.";

export function ensureWritten<T>(
  result: { data: T[] | T | null; error: { message?: string } | null },
  what: string,
): T[] {
  if (result.error) throw result.error;
  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
  if (rows.length === 0) throw new Error(`${what} ${NO_PERMISSION_MESSAGE}`);
  return rows;
}
