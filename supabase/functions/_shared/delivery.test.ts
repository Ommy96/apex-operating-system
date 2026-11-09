import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deliver, findSensitiveContent, inQuietHours } from "./delivery.ts";

Deno.test("sensitive beneficiary detail is detected", () => {
  assert(findSensitiveContent("Update", "Child is HIV positive"));
  assert(findSensitiveContent(null, "<p>New safeguarding incident</p>"));
  assert(findSensitiveContent("Profile UFN-432DD2F8 updated"));
  assertEquals(findSensitiveContent("New update", "A record you follow changed. Open ApexOS to view it."), null);
});

Deno.test("quiet hours wrap past midnight in Nairobi time", () => {
  // 20:30 UTC = 23:30 Nairobi → inside 21:00–07:00
  assert(inQuietHours(new Date("2026-11-09T20:30:00Z"), "21:00", "07:00", "Africa/Nairobi"));
  // 09:00 UTC = 12:00 Nairobi → outside
  assert(!inQuietHours(new Date("2026-11-09T09:00:00Z"), "21:00", "07:00", "Africa/Nairobi"));
});

// Minimal in-memory stand-in for the message_deliveries table.
function fakeDb(prefs: Record<string, unknown> = {}) {
  const rows: any[] = [];
  const from = (table: string) => {
    const q: any = { filters: [] as [string, string, unknown][], table };
    q.insert = (v: any) => {
      q.op = "insert"; q.val = v; return q;
    };
    q.update = (v: any) => { q.op = "update"; q.val = v; return q; };
    q.select = () => { if (!q.op) q.op = "select"; return q; };
    q.eq = (c: string, v: unknown) => { q.filters.push(["eq", c, v]); return q; };
    q.in = (c: string, v: unknown) => { q.filters.push(["in", c, v]); return q; };
    const match = (r: any) => q.filters.every(([k, c, v]: any) => k === "eq" ? r[c] === v : v.includes(r[c]));
    const run = () => {
      if (table !== "message_deliveries") return { data: (prefs as any)[table] ?? null, error: null };
      if (q.op === "insert") {
        if (rows.some((r) => r.idempotency_key === q.val.idempotency_key)) return { data: null, error: { code: "23505", message: "dup" } };
        const r = { id: crypto.randomUUID(), attempts: 0, ...q.val }; rows.push(r); return { data: r, error: null };
      }
      const hit = rows.filter(match);
      if (q.op === "update") { hit.forEach((r) => Object.assign(r, q.val)); return { data: hit, error: null }; }
      return { data: hit, error: null };
    };
    q.maybeSingle = async () => { const r = run(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; };
    q.single = q.maybeSingle;
    q.then = (res: any) => Promise.resolve(run()).then(res);
    return q;
  };
  return { rows, client: { from } };
}

Deno.test("forced failure records failed; retry with same key never duplicates a sent message", async () => {
  Deno.env.delete("WHATSAPP_ACCESS_TOKEN");
  const db = fakeDb();
  const input = { organizationId: "o", channel: "whatsapp" as const, source: "t", idempotencyKey: "k1", to: "254700000000", text: "Hello" };
  const first = await deliver(db.client, input);
  assertEquals(first.status, "not_configured");
  assertEquals(db.rows.length, 1);

  // Simulate the provider now accepting: fake fetch + creds
  Deno.env.set("WHATSAPP_ACCESS_TOKEN", "x"); Deno.env.set("WHATSAPP_PHONE_NUMBER_ID", "1");
  let calls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => { calls++; return new Response(JSON.stringify({ messages: [{ id: "wamid" }] }), { status: 200 }); }) as any;
  try {
    const second = await deliver(db.client, input);
    assertEquals(second.status, "sent");
    const third = await deliver(db.client, input);
    assertEquals(third.duplicate, true);
    assertEquals(calls, 1);
    assertEquals(db.rows.length, 1);
    assertEquals(db.rows[0].attempts, 2);
  } finally {
    globalThis.fetch = realFetch;
    Deno.env.delete("WHATSAPP_ACCESS_TOKEN"); Deno.env.delete("WHATSAPP_PHONE_NUMBER_ID");
  }
});

Deno.test("provider error records as failed", async () => {
  Deno.env.set("RESEND_API_KEY", "x");
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ message: "boom" }), { status: 500 })) as any;
  try {
    const db = fakeDb();
    const r = await deliver(db.client, { organizationId: "o", channel: "email", source: "t", idempotencyKey: "e1", to: "a@b.co", subject: "Hi", html: "<p>Hi</p>" });
    assertEquals(r.status, "failed");
    assertEquals(db.rows[0].status, "failed");
  } finally { globalThis.fetch = realFetch; }
});

Deno.test("sensitive message is blocked and never sent", async () => {
  let calls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => { calls++; return new Response("{}"); }) as any;
  try {
    const db = fakeDb();
    const r = await deliver(db.client, { organizationId: "o", channel: "email", source: "t", idempotencyKey: "s1", to: "a@b.co", subject: "Case", html: "Child disclosed abuse" });
    assertEquals(r.status, "blocked_sensitive");
    assertEquals(calls, 0);
  } finally { globalThis.fetch = realFetch; }
});

Deno.test("per-user preference and quiet hours hold non-transactional sends", async () => {
  let calls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => { calls++; return new Response("{}"); }) as any;
  Deno.env.set("RESEND_API_KEY", "x");
  try {
    const off = fakeDb({ user_notification_preferences: { is_enabled: false } });
    const a = await deliver(off.client, { organizationId: "o", channel: "email", source: "t", idempotencyKey: "p1", to: "a@b.co", recipientUserId: "u", subject: "Hi", html: "Hi" });
    assertEquals(a.status, "skipped_preference");
    const quiet = fakeDb({ user_communication_settings: { quiet_hours_enabled: true, quiet_start: "00:00", quiet_end: "23:59", timezone: "UTC" } });
    const b = await deliver(quiet.client, { organizationId: "o", channel: "email", source: "t", idempotencyKey: "q1", to: "a@b.co", recipientUserId: "u", subject: "Hi", html: "Hi" });
    assertEquals(b.status, "skipped_quiet_hours");
    assertEquals(calls, 0);
  } finally { globalThis.fetch = realFetch; }
});
