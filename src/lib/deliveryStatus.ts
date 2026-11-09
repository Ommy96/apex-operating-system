// Mirrors DELIVERY_STATUS in supabase/functions/_shared/delivery.ts — change both together.
export const DELIVERY_STATUS = {
  QUEUED: "queued",
  SENDING: "sending",
  SENT: "sent",
  FAILED: "failed",
  SKIPPED_QUIET_HOURS: "skipped_quiet_hours",
  SKIPPED_PREFERENCE: "skipped_preference",
  BLOCKED_SENSITIVE: "blocked_sensitive",
  NOT_CONFIGURED: "not_configured",
} as const;

export const normStatus = (s: unknown) => String(s ?? "").trim().toLowerCase();
export const isStatus = (s: unknown, target: string) => normStatus(s) === normStatus(target);

export const DELIVERY_STATUS_LABEL: Record<string, string> = {
  [DELIVERY_STATUS.QUEUED]: "Queued",
  [DELIVERY_STATUS.SENDING]: "Sending",
  [DELIVERY_STATUS.SENT]: "Sent",
  [DELIVERY_STATUS.FAILED]: "Failed",
  [DELIVERY_STATUS.SKIPPED_QUIET_HOURS]: "Held (quiet hours)",
  [DELIVERY_STATUS.SKIPPED_PREFERENCE]: "Recipient opted out",
  [DELIVERY_STATUS.BLOCKED_SENSITIVE]: "Blocked (confidential content)",
  [DELIVERY_STATUS.NOT_CONFIGURED]: "Not sent — channel not set up",
};

const RETRYABLE: string[] = [DELIVERY_STATUS.FAILED, DELIVERY_STATUS.NOT_CONFIGURED, DELIVERY_STATUS.SKIPPED_QUIET_HOURS];
export const isRetryable = (s: unknown) => RETRYABLE.includes(normStatus(s));
