/**
 * Readable, privacy-aware record URLs.
 *
 * People (beneficiaries, households) are identified in the URL by their CODE —
 * never by name. Non-sensitive entities (programmes, projects, activities) use
 * a name slug. All helpers fall back to the raw id when no code/slug exists yet.
 */

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v?: string | null): boolean => !!v && UUID_RE.test(v);

type Identifiable = { id?: string | null } & Record<string, any>;

const pick = (record: Identifiable | null | undefined, field: string, fallbackId?: string | null) =>
  (record?.[field] as string | undefined) || record?.id || fallbackId || "";

export const beneficiaryPath = (b: Identifiable | null | undefined, fallbackId?: string | null) =>
  `/beneficiaries/${encodeURIComponent(pick(b, "beneficiary_code", fallbackId))}`;

export const householdPath = (h: Identifiable | null | undefined, fallbackId?: string | null) =>
  `/households/${encodeURIComponent(pick(h, "household_code", fallbackId))}`;

export const programPath = (p: Identifiable | null | undefined, fallbackId?: string | null) =>
  `/programs/dashboard/${encodeURIComponent(pick(p, "slug", fallbackId))}`;

export const projectPath = (p: Identifiable | null | undefined, fallbackId?: string | null) =>
  `/projects/dashboard/${encodeURIComponent(pick(p, "slug", fallbackId))}`;

export const activityPath = (a: Identifiable | null | undefined, fallbackId?: string | null) =>
  `/activities/${encodeURIComponent(pick(a, "slug", fallbackId))}`;

/** Identifier only (no path) — useful when composing nested routes. */
export const recordRef = (
  record: Identifiable | null | undefined,
  field: "beneficiary_code" | "household_code" | "slug",
  fallbackId?: string | null,
) => pick(record, field, fallbackId);
