// Mirrors the CHECK constraint on beneficiary_needs.priority and
// waitlist_application_needs.priority: low | normal | high | urgent.
// (staff_tasks / board_action_items use a different set with "medium".)
export const NEED_PRIORITY = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type NeedPriority = (typeof NEED_PRIORITY)[keyof typeof NEED_PRIORITY];

export const NEED_PRIORITY_VALUES: NeedPriority[] = Object.values(NEED_PRIORITY);

export const DEFAULT_NEED_PRIORITY: NeedPriority = NEED_PRIORITY.NORMAL;

/** Case-insensitive normalisation; unknown values (e.g. legacy "medium") fall back to normal. */
export function toNeedPriority(value: unknown): NeedPriority {
  const v = String(value ?? "").trim().toLowerCase();
  return (NEED_PRIORITY_VALUES as string[]).includes(v) ? (v as NeedPriority) : DEFAULT_NEED_PRIORITY;
}
