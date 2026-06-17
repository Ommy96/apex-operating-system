// Donor-facing impact feed: chronological anonymized posts with attribution.
// Returns HTTP 200 even on handled errors (UI-toast contract).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type Post = {
  id: string;
  kind: "field_log" | "activity_completed" | "disbursement" | "allocation_summary";
  occurred_at: string;
  title: string;
  body: string;
  photo_url: string | null;
  project_id: string | null;
  project_name: string | null;
  attribution_base: number;
  attribution_currency: string;
  beneficiary_label: string | null;
  meta: any;
};

function ageBracket(dob?: string | null) {
  if (!dob) return "a participant";
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400_000));
  if (years < 5) return "a child under 5";
  if (years < 12) return "a child";
  if (years < 18) return "a young person";
  return "an adult participant";
}

function anonymize(b: any, grade?: string | null) {
  if (!b) return "a participant";
  if (grade) return `a student in ${grade}`;
  if (b.grade) return `a student in ${b.grade}`;
  if (b.academic_level) return `a learner at ${b.academic_level} level`;
  return ageBracket(b.date_of_birth);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const body = (req.method === "POST" ? await req.json().catch(() => ({})) : {}) as {
      donor_account_id?: string;
      limit?: number;
      before?: string; // ISO timestamp for cursor
    };
    const limit = Math.min(50, Math.max(5, body.limit ?? 20));

    // Resolve donor from JWT
    let donorAccountId = body.donor_account_id;
    if (!donorAccountId) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (!token) {
        return new Response(JSON.stringify({ ok: false, message: "Unauthorized" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: ures } = await supabase.auth.getUser(token);
      const uid = ures?.user?.id;
      if (!uid) {
        return new Response(JSON.stringify({ ok: false, message: "Unauthorized" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: acct } = await supabase
        .from("donor_accounts").select("id")
        .eq("user_id", uid).eq("is_active", true).maybeSingle();
      donorAccountId = acct?.id;
      if (!donorAccountId) {
        return new Response(JSON.stringify({ ok: true, posts: [], totals: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Load donor allocations (joined with beneficiary, activity_disbursement, project)
    const { data: allocs, error: allocErr } = await supabase
      .from("allocations")
      .select("id, scope, amount_base, base_currency, allocated_at, beneficiary_id, project_id, program_id, activity_disbursement_id, status, donation_id")
      .eq("donor_account_id", donorAccountId);
    if (allocErr) throw allocErr;

    if (!allocs || allocs.length === 0) {
      return new Response(JSON.stringify({ ok: true, posts: [], totals: { committed: 0, allocated: 0, received: 0, currency: "KES" } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const orgId =
      (await supabase.from("donor_accounts").select("organization_id").eq("id", donorAccountId).maybeSingle())
        .data?.organization_id;

    const beneficiaryIds = new Set<string>();
    const projectIds = new Set<string>();
    const programIds = new Set<string>();
    const disbIds = new Set<string>();
    allocs.forEach((a: any) => {
      a.beneficiary_id && beneficiaryIds.add(a.beneficiary_id);
      a.project_id && projectIds.add(a.project_id);
      a.program_id && programIds.add(a.program_id);
      a.activity_disbursement_id && disbIds.add(a.activity_disbursement_id);
    });

    // Per-project totals from this donor (used to weight project-level posts)
    const projTotals = new Map<string, number>();
    const benTotals = new Map<string, number>();
    const disbAttr = new Map<string, number>();
    let totalAllocated = 0;
    allocs.forEach((a: any) => {
      const amt = Number(a.amount_base ?? 0);
      totalAllocated += amt;
      if (a.project_id) projTotals.set(a.project_id, (projTotals.get(a.project_id) ?? 0) + amt);
      if (a.beneficiary_id) benTotals.set(a.beneficiary_id, (benTotals.get(a.beneficiary_id) ?? 0) + amt);
      if (a.activity_disbursement_id)
        disbAttr.set(a.activity_disbursement_id, (disbAttr.get(a.activity_disbursement_id) ?? 0) + amt);
    });

    // Compute total project allocated across ALL donors (denominator for project-share posts)
    let projAllAllocated = new Map<string, number>();
    if (projectIds.size) {
      const { data: allProjAllocs } = await supabase
        .from("allocations")
        .select("project_id, amount_base")
        .in("project_id", Array.from(projectIds));
      (allProjAllocs || []).forEach((a: any) => {
        if (!a.project_id) return;
        projAllAllocated.set(a.project_id, (projAllAllocated.get(a.project_id) ?? 0) + Number(a.amount_base ?? 0));
      });
    }

    // Direct sponsorship + consent (controls anonymization)
    const directSponsoredIds = new Set<string>();
    if (orgId && beneficiaryIds.size) {
      const { data: bdRows } = await supabase
        .from("beneficiary_donors")
        .select("beneficiary_id, donor_account_id")
        .eq("organization_id", orgId)
        .eq("donor_account_id", donorAccountId)
        .in("beneficiary_id", Array.from(beneficiaryIds));
      (bdRows || []).forEach((r: any) => directSponsoredIds.add(r.beneficiary_id));
    }
    const consentedIds = new Set<string>();
    if (directSponsoredIds.size) {
      const { data: consents } = await supabase
        .from("consent_records")
        .select("beneficiary_id, consent_type, consent_given, status")
        .in("beneficiary_id", Array.from(directSponsoredIds))
        .eq("consent_given", true)
        .eq("status", "active");
      (consents || []).forEach((c: any) => {
        const t = String(c.consent_type || "").toLowerCase();
        if (t.includes("photo") || t.includes("story") || t.includes("media") || t.includes("publication")) {
          consentedIds.add(c.beneficiary_id);
        }
      });
    }
    const canIdentify = (bid: string | null) =>
      bid !== null && directSponsoredIds.has(bid) && consentedIds.has(bid);

    // === Fetch sources ===
    const beforeISO = body.before || new Date().toISOString();
    const since = new Date(Date.now() - 365 * 86400_000).toISOString();
    const allBenIds = Array.from(beneficiaryIds);
    const allProjIds = Array.from(projectIds);

    const [
      benLookupRes,
      projLookupRes,
      flogsRes,
      actsRes,
      disbRes,
    ] = await Promise.all([
      allBenIds.length
        ? supabase.from("beneficiaries")
            .select("id, display_name, grade, academic_level, date_of_birth, photo_url")
            .in("id", allBenIds)
        : Promise.resolve({ data: [] as any[] }),
      allProjIds.length
        ? supabase.from("projects").select("id, name").in("id", allProjIds)
        : Promise.resolve({ data: [] as any[] }),
      allProjIds.length
        ? supabase.from("field_logs")
            .select("id, project_id, beneficiary_id, logged_at, category, title, body, photo_urls")
            .in("project_id", allProjIds)
            .in("category", ["photo", "milestone"])
            .lt("logged_at", beforeISO)
            .gte("logged_at", since)
            .order("logged_at", { ascending: false })
            .limit(limit * 2)
        : Promise.resolve({ data: [] as any[] }),
      allProjIds.length
        ? supabase.from("activities")
            .select("id, project_id, name, description, completed_at, type")
            .in("project_id", allProjIds)
            .eq("status", "completed")
            .not("completed_at", "is", null)
            .lt("completed_at", beforeISO)
            .gte("completed_at", since)
            .order("completed_at", { ascending: false })
            .limit(limit)
        : Promise.resolve({ data: [] as any[] }),
      disbIds.size
        ? supabase.from("activity_disbursements")
            .select("id, beneficiary_id, activity_id, kind, quantity, unit, monetary_value, currency, received_at, receipt_url, notes")
            .in("id", Array.from(disbIds))
            .lt("received_at", beforeISO)
            .gte("received_at", since)
            .order("received_at", { ascending: false })
            .limit(limit)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const benMap = new Map<string, any>((benLookupRes.data || []).map((b: any) => [b.id, b]));
    const projMap = new Map<string, any>((projLookupRes.data || []).map((p: any) => [p.id, p]));

    const posts: Post[] = [];

    // Field logs
    for (const f of (flogsRes.data || []) as any[]) {
      const ben = f.beneficiary_id ? benMap.get(f.beneficiary_id) : null;
      // Skip if donor doesn't fund this beneficiary OR this project at all
      const benAttr = ben && benTotals.has(f.beneficiary_id) ? benTotals.get(f.beneficiary_id)! : 0;
      const projAttrTotal = projTotals.get(f.project_id) ?? 0;
      const projAllTotal = projAllAllocated.get(f.project_id) ?? 0;
      const share = projAllTotal > 0 ? projAttrTotal / projAllTotal : 0;
      const attribution = benAttr > 0 ? benAttr * 0.05 /* per-post sliver */ : projAttrTotal * 0.01;
      if (attribution <= 0 && share <= 0) continue;
      const label = ben
        ? canIdentify(f.beneficiary_id) ? ben.display_name : anonymize(ben)
        : null;
      posts.push({
        id: `flog:${f.id}`,
        kind: "field_log",
        occurred_at: f.logged_at,
        title: f.title || (f.category === "milestone" ? "Milestone reached" : "Field update"),
        body: (f.body || "").slice(0, 220),
        photo_url: Array.isArray(f.photo_urls) && f.photo_urls.length ? f.photo_urls[0] : null,
        project_id: f.project_id,
        project_name: projMap.get(f.project_id)?.name || null,
        attribution_base: Math.max(0, Math.round(attribution)),
        attribution_currency: "KES",
        beneficiary_label: label,
        meta: { category: f.category, share_of_project: Number(share.toFixed(4)) },
      });
    }

    // Activity completions
    for (const a of (actsRes.data || []) as any[]) {
      const projAttrTotal = projTotals.get(a.project_id) ?? 0;
      const projAllTotal = projAllAllocated.get(a.project_id) ?? 0;
      const share = projAllTotal > 0 ? projAttrTotal / projAllTotal : 0;
      if (share <= 0 && projAttrTotal <= 0) continue;
      // Rough attribution per activity: project share spread over completed activities in last year
      posts.push({
        id: `act:${a.id}`,
        kind: "activity_completed",
        occurred_at: a.completed_at,
        title: `Activity completed: ${a.name}`,
        body: (a.description || `A ${a.type || "project"} activity was completed on the ground.`).slice(0, 220),
        photo_url: null,
        project_id: a.project_id,
        project_name: projMap.get(a.project_id)?.name || null,
        attribution_base: Math.max(0, Math.round(projAttrTotal * 0.01)),
        attribution_currency: "KES",
        beneficiary_label: null,
        meta: { activity_type: a.type, share_of_project: Number(share.toFixed(4)) },
      });
    }

    // Disbursements (directly attributed)
    for (const d of (disbRes.data || []) as any[]) {
      const attr = disbAttr.get(d.id) ?? 0;
      if (attr <= 0) continue;
      const ben = d.beneficiary_id ? benMap.get(d.beneficiary_id) : null;
      const label = ben
        ? canIdentify(d.beneficiary_id) ? ben.display_name : anonymize(ben)
        : null;
      posts.push({
        id: `disb:${d.id}`,
        kind: "disbursement",
        occurred_at: d.received_at || d.created_at || new Date().toISOString(),
        title: `${d.kind || "Item"} delivered${d.quantity ? ` × ${d.quantity}` : ""}`,
        body: d.notes || `Distribution of ${d.kind || "items"}${label ? ` to ${label}` : ""}.`,
        photo_url: d.receipt_url || null,
        project_id: null,
        project_name: null,
        attribution_base: Math.round(attr),
        attribution_currency: "KES",
        beneficiary_label: label,
        meta: { quantity: d.quantity, unit: d.unit, kind: d.kind },
      });
    }

    // Allocation summary posts (one per month with allocations)
    const monthly = new Map<string, { date: string; count: number; sum: number; projects: Set<string> }>();
    allocs.forEach((a: any) => {
      const d = a.allocated_at?.slice(0, 7);
      if (!d) return;
      const m = monthly.get(d) || { date: a.allocated_at, count: 0, sum: 0, projects: new Set<string>() };
      m.count++;
      m.sum += Number(a.amount_base ?? 0);
      if (a.project_id) m.projects.add(a.project_id);
      monthly.set(d, m);
    });
    for (const [, m] of monthly) {
      if (new Date(m.date).toISOString() >= beforeISO) continue;
      posts.push({
        id: `alloc:${m.date.slice(0, 7)}`,
        kind: "allocation_summary",
        occurred_at: m.date,
        title: `Your contribution funded ${m.count} allocation${m.count === 1 ? "" : "s"}`,
        body: `Spread across ${m.projects.size} project${m.projects.size === 1 ? "" : "s"} during ${new Date(m.date).toLocaleString(undefined, { month: "long", year: "numeric" })}.`,
        photo_url: null,
        project_id: null,
        project_name: null,
        attribution_base: Math.round(m.sum),
        attribution_currency: "KES",
        beneficiary_label: null,
        meta: {},
      });
    }

    posts.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));
    const sliced = posts.slice(0, limit);
    const nextCursor = sliced.length === limit ? sliced[sliced.length - 1].occurred_at : null;

    // Totals stripe
    const { data: donations } = await supabase
      .from("donations")
      .select("amount, currency, status")
      .eq("donor_account_id", donorAccountId);
    const committed = (donations || []).reduce((s, d: any) => s + Number(d.amount ?? 0), 0);
    const received = (donations || [])
      .filter((d: any) => ["completed", "succeeded", "success"].includes(String(d.status || "")))
      .reduce((s, d: any) => s + Number(d.amount ?? 0), 0);

    return new Response(JSON.stringify({
      ok: true,
      posts: sliced,
      next_cursor: nextCursor,
      totals: {
        committed: Math.round(committed),
        received: Math.round(received),
        allocated: Math.round(totalAllocated),
        currency: "KES",
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: String(e?.message ?? e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});