/**
 * Case-insensitive status comparison helpers.
 *
 * Status columns across the platform store mixed casing (e.g.
 * `"active"`, `"Active"`, `"Completed"`, `"Dropped"`). Direct equality
 * comparisons like `status === "active"` therefore silently miss rows
 * and quietly poison downstream intelligence metrics. Always go through
 * these helpers.
 */

export const normaliseStatus = (s: string | null | undefined): string =>
  (s ?? "").toString().trim().toLowerCase();

export const isStatus = (
  s: string | null | undefined,
  ...candidates: string[]
): boolean => {
  const n = normaliseStatus(s);
  return candidates.some(c => c.toLowerCase() === n);
};

export const isActiveStatus = (s: string | null | undefined): boolean =>
  isStatus(s, "active");

export const isCompletedStatus = (s: string | null | undefined): boolean =>
  isStatus(s, "completed", "complete", "done");

export const isExitedStatus = (s: string | null | undefined): boolean =>
  isStatus(s, "exited", "dropped", "withdrawn", "left");

export const isPausedStatus = (s: string | null | undefined): boolean =>
  isStatus(s, "paused", "on hold", "suspended");

export const isResolvedStatus = (s: string | null | undefined): boolean =>
  isStatus(s, "resolved", "closed");