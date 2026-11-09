// Shared outbound delivery layer: idempotency, delivery log, preferences,
// quiet hours, sensitive-content guard. Every outbound email/WhatsApp/SMS
// should go through deliver() so one key can never send twice.
// deno-lint-ignore-file no-explicit-any

export const EMAIL_FROM_DOMAIN = "noreply@apex.inferatechs.com";

// Mirrored in src/lib/deliveryStatus.ts — change both together.
export const DELIVERY_STATUS = {
  QUEUED: "queued", SENDING: "sending", SENT: "sent", FAILED: "failed",
  SKIPPED_QUIET_HOURS: "skipped_quiet_hours", SKIPPED_PREFERENCE: "skipped_preference",
  BLOCKED_SENSITIVE: "blocked_sensitive", NOT_CONFIGURED: "not_configured",
} as const;
const S = DELIVERY_STATUS;
export const normStatus = (s: unknown) => String(s ?? "").trim().toLowerCase();
export const isSent = (s: unknown) => normStatus(s) === S.SENT;
export const isSkipped = (s: unknown) => normStatus(s) === S.SKIPPED_QUIET_HOURS || normStatus(s) === S.SKIPPED_PREFERENCE;

export type Channel = "email" | "whatsapp" | "sms";

export interface DeliverInput {
  organizationId: string | null;
  channel: Channel;
  source: string;
  idempotencyKey: string;
  to: string;
  recipientUserId?: string | null;
  subject?: string | null;
  html?: string;
  text?: string;
  fromName?: string;
  linkPath?: string | null;
  transactional?: boolean; // invitations, account mail: bypass quiet hours/preferences
  whatsappTemplate?: { name: string; language?: string; components?: unknown[] };
  createdBy?: string | null;
}

export interface DeliverResult {
  status: string;
  duplicate?: boolean;
  error?: string | null;
  deliveryId?: string;
}

// Terms that must never appear in an outbound message body. Notifications link
// to secure pages instead of carrying confidential beneficiary detail.
const SENSITIVE_PATTERNS: RegExp[] = [
  /\bhiv\b/i, /\baids\b/i, /\bart\s+regimen\b/i, /\bviral\s+load\b/i,
  /\bsafeguarding\b/i, /\babuse[ds]?\b/i, /\bdefilement\b/i, /\brape\b/i,
  /\bdiagnos(is|ed)\b/i, /\bmedical\s+(condition|history|record)\b/i,
  /\bmental\s+health\b/i, /\bdisabilit(y|ies)\b/i, /\bpregnan(t|cy)\b/i,
  /\bvulnerability\s+(score|assessment)\b/i, /\bnational\s+id\b/i,
  /\bbirth\s+cert(ificate)?\b/i, /\bUFN-[0-9A-F]{6,}\b/i,
];

export function findSensitiveContent(...parts: (string | null | undefined)[]): string | null {
  const text = parts.filter(Boolean).join("\n").replace(/<[^>]+>/g, " ");
  for (const re of SENSITIVE_PATTERNS) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

function minutesOf(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function inQuietHours(now: Date, start: string, end: string, timeZone: string): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const cur = h * 60 + m, s = minutesOf(start), e = minutesOf(end);
  if (s === e) return false;
  return s < e ? cur >= s && cur < e : cur >= s || cur < e;
}

async function sendEmail(input: DeliverInput, key: string): Promise<{ ok: boolean; id?: string; error?: string; notConfigured?: boolean }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { ok: false, notConfigured: true, error: "Email is not configured (RESEND_API_KEY missing)" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key.slice(0, 256) },
    body: JSON.stringify({
      from: `${input.fromName || "ApexOS"} <${EMAIL_FROM_DOMAIN}>`,
      to: [input.to],
      subject: input.subject || "",
      html: input.html,
      text: input.text,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${body?.message || JSON.stringify(body)}` };
  return { ok: true, id: body?.id };
}

async function sendWhatsApp(input: DeliverInput): Promise<{ ok: boolean; id?: string; error?: string; notConfigured?: boolean }> {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) {
    return { ok: false, notConfigured: true, error: "WhatsApp is not configured: WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are not set. Nothing was sent." };
  }
  const to = input.to.replace(/[^\d]/g, "");
  const payload: Record<string, unknown> = { messaging_product: "whatsapp", to };
  if (input.whatsappTemplate) {
    payload.type = "template";
    payload.template = {
      name: input.whatsappTemplate.name,
      language: { code: input.whatsappTemplate.language || "en_US" },
      ...(input.whatsappTemplate.components ? { components: input.whatsappTemplate.components } : {}),
    };
  } else {
    payload.type = "text";
    payload.text = { preview_url: false, body: input.text || "" };
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body?.error?.message || `WhatsApp API error ${res.status}` };
  return { ok: true, id: body?.messages?.[0]?.id };
}

async function sendSms(input: DeliverInput): Promise<{ ok: boolean; id?: string; error?: string; notConfigured?: boolean }> {
  const apiKey = Deno.env.get("AT_API_KEY");
  const username = Deno.env.get("AT_USERNAME");
  if (!apiKey || !username) return { ok: false, notConfigured: true, error: "SMS is not configured (Africa's Talking credentials missing)" };
  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: { apiKey, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ username, to: input.to, message: input.text || "" }),
  });
  const body = await res.json().catch(() => ({}));
  const r = body?.SMSMessageData?.Recipients?.[0];
  if (!res.ok || (r && r.statusCode >= 400)) return { ok: false, error: `SMS failed: ${r?.status || JSON.stringify(body)}` };
  return { ok: true, id: r?.messageId };
}

/**
 * Idempotent send. The idempotency key is unique in message_deliveries:
 * - already sent → returns duplicate, sends nothing
 * - currently sending → returns duplicate (another worker owns it)
 * - failed/queued/not_configured → claimed atomically and re-attempted (retry)
 */
export async function deliver(admin: any, input: DeliverInput): Promise<DeliverResult> {
  const key = input.idempotencyKey;
  const base = {
    organization_id: input.organizationId,
    channel: input.channel,
    source: input.source,
    idempotency_key: key,
    recipient_user_id: input.recipientUserId ?? null,
    recipient_contact: input.to,
    subject: input.subject ?? null,
    link_path: input.linkPath ?? null,
    transactional: !!input.transactional,
    created_by: input.createdBy ?? null,
    payload: {
      html: input.html ?? null, text: input.text ?? null, fromName: input.fromName ?? null,
      whatsappTemplate: input.whatsappTemplate ?? null,
    },
  };

  // Insert or find existing
  const ins = await admin.from("message_deliveries").insert({ ...base, status: S.QUEUED }).select("id,status").maybeSingle();
  let row = ins.data;
  if (ins.error) {
    if (ins.error.code !== "23505") return { status: S.FAILED, error: ins.error.message };
    const ex = await admin.from("message_deliveries").select("id,status").eq("idempotency_key", key).single();
    if (ex.error) return { status: S.FAILED, error: ex.error.message };
    row = ex.data;
    if (!row) return { status: S.FAILED, error: "Delivery record missing" };
    if ([S.SENT, S.SENDING, S.SKIPPED_PREFERENCE, S.BLOCKED_SENSITIVE].includes(normStatus(row.status) as any)) {
      return { status: row.status, duplicate: true, deliveryId: row.id };
    }
  }

  const finish = async (status: string, extra: Record<string, unknown> = {}) => {
    const { error: upErr } = await admin.from("message_deliveries").update({ status, updated_at: new Date().toISOString(), ...extra }).eq("id", row.id);
    if (upErr) console.error("delivery log update failed", upErr.message);
    return { status, deliveryId: row.id, error: (extra.last_error as string) ?? null };
  };

  // Atomic claim so concurrent retries cannot both send
  const claim = await admin.from("message_deliveries")
    .update({ status: S.SENDING, updated_at: new Date().toISOString() })
    .eq("id", row.id).in("status", [S.QUEUED, S.FAILED, S.NOT_CONFIGURED, S.SKIPPED_QUIET_HOURS])
    .select("id,attempts");
  if (claim.error || !claim.data?.length) return { status: S.SENDING, duplicate: true, deliveryId: row.id };
  const attempts = (claim.data[0].attempts ?? 0) + 1;

  const hit = findSensitiveContent(input.subject, input.text, input.html);
  if (hit) return finish(S.BLOCKED_SENSITIVE, { attempts, last_error: `Blocked: message contains confidential detail ("${hit}"). Link to a secure page instead.` });

  if (!input.transactional && input.recipientUserId) {
    const { data: pref, error: prefErr } = await admin.from("user_notification_preferences")
      .select("is_enabled").eq("user_id", input.recipientUserId).eq("preference_key", `channel:${input.channel}`).maybeSingle();
    if (prefErr) return finish(S.FAILED, { attempts, last_error: `Could not read recipient preferences: ${prefErr.message}` });
    if (pref && pref.is_enabled === false) return finish(S.SKIPPED_PREFERENCE, { attempts, last_error: `Recipient turned off ${input.channel}` });
    const { data: qs, error: qsErr } = await admin.from("user_communication_settings")
      .select("quiet_hours_enabled,quiet_start,quiet_end,timezone").eq("user_id", input.recipientUserId).maybeSingle();
    if (qsErr) return finish(S.FAILED, { attempts, last_error: `Could not read quiet hours: ${qsErr.message}` });
    if (qs?.quiet_hours_enabled && inQuietHours(new Date(), qs.quiet_start, qs.quiet_end, qs.timezone || "Africa/Nairobi")) {
      return finish(S.SKIPPED_QUIET_HOURS, { attempts, last_error: "Held: recipient quiet hours. Retry after quiet hours end." });
    }
  }

  try {
    const r = input.channel === "email" ? await sendEmail(input, key)
      : input.channel === "whatsapp" ? await sendWhatsApp(input)
      : await sendSms(input);
    if (r.ok) return finish(S.SENT, { attempts, provider_message_id: r.id ?? null, sent_at: new Date().toISOString(), last_error: null });
    return finish(r.notConfigured ? S.NOT_CONFIGURED : S.FAILED, { attempts, last_error: r.error });
  } catch (e) {
    return finish(S.FAILED, { attempts, last_error: (e as Error).message });
  }
}

/** Re-run a stored delivery with its original key (used by the retry action). */
export async function retryDelivery(admin: any, id: string): Promise<DeliverResult> {
  const { data: d, error } = await admin.from("message_deliveries").select("*").eq("id", id).single();
  if (error) return { status: S.FAILED, error: error.message };
  if (!d) return { status: S.FAILED, error: "Delivery not found" };
  if (isSent(d.status)) return { status: S.SENT, duplicate: true, deliveryId: id };
  return deliver(admin, {
    organizationId: d.organization_id, channel: d.channel, source: d.source, idempotencyKey: d.idempotency_key,
    to: d.recipient_contact, recipientUserId: d.recipient_user_id, subject: d.subject,
    html: d.payload?.html ?? undefined, text: d.payload?.text ?? undefined, fromName: d.payload?.fromName ?? undefined,
    whatsappTemplate: d.payload?.whatsappTemplate ?? undefined, linkPath: d.link_path, transactional: d.transactional,
  });
}
