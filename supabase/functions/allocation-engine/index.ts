// Allocation Engine — eagerly allocates donations to beneficiaries / pools
// and handles beneficiary exits (redirect or hold). Never refunds.
//
// POST body:
//   { mode: "allocate_donation", donationId: uuid }
//   { mode: "exit_beneficiary", beneficiaryId, projectId,
//     resolution: "redirect" | "hold", redirectBeneficiaryId?, reason }

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    // Always 200 per project convention so the UI can surface error messages cleanly.
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json", "x-actual-status": String(status) },
  });

// --- FX helpers ---------------------------------------------------------
async function getFxRate(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<{ rate: number; at: string }> {
  const f = (from || "").toUpperCase();
  const t = (to || "KES").toUpperCase();
  if (f === t) return { rate: 1, at: new Date().toISOString() };

  // Try direct
  const { data: direct } = await supabase
    .from("currency_rates")
    .select("rate, fetched_at")
    .eq("base_currency", f)
    .eq("target_currency", t)
    .maybeSingle();
  if (direct?.rate) return { rate: Number(direct.rate), at: direct.fetched_at ?? new Date().toISOString() };

  // Try inverse
  const { data: inverse } = await supabase
    .from("currency_rates")
    .select("rate, fetched_at")
    .eq("base_currency", t)
    .eq("target_currency", f)
    .maybeSingle();
  if (inverse?.rate && Number(inverse.rate) > 0) {
    return { rate: 1 / Number(inverse.rate), at: inverse.fetched_at ?? new Date().toISOString() };
  }

  // Last resort: trigger a refresh, then retry once
  try {
    await supabase.functions.invoke("fetch-exchange-rates");
    const { data: retry } = await supabase
      .from("currency_rates")
      .select("rate, fetched_at")
      .eq("base_currency", f)
      .eq("target_currency", t)
      .maybeSingle();
    if (retry?.rate) return { rate: Number(retry.rate), at: retry.fetched_at ?? new Date().toISOString() };
  } catch (_) { /* ignore */ }

  // Hard fallback: 1:1 to avoid blocking the ledger; flagged via rate=1
  console.warn(`FX rate not found ${f}->${t}, defaulting to 1`);
  return { rate: 1, at: new Date().toISOString() };
}

async function getBaseCurrency(supabase: SupabaseClient, orgId: string): Promise<string> {
  const { data } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle();
  const s = (data?.settings ?? {}) as Record<string, unknown>;
  return ((s.base_currency as string) || "KES").toUpperCase();
}

// --- Pool upsert --------------------------------------------------------
async function upsertPool(
  supabase: SupabaseClient,
  args: {
    organization_id: string;
    donor_account_id: string;
    scope: "direct_beneficiary" | "project_pool" | "program_unrestricted";
    scope_beneficiary_id: string | null;
    scope_project_id: string | null;
    scope_program_id: string | null;
    currency: string;
    add_native: number;
    add_base: number;
    fx_rate: number;
    fx_at: string;
  },
) {
  // Find existing
  const q = supabase
    .from("donor_pools")
    .select("id, balance_native, balance_base")
    .eq("organization_id", args.organization_id)
    .eq("donor_account_id", args.donor_account_id)
    .eq("scope", args.scope)
    .eq("currency", args.currency);
  const withNull = (col: string, v: string | null) => v === null ? q.is(col, null) : q.eq(col, v);
  withNull("scope_beneficiary_id", args.scope_beneficiary_id);
  withNull("scope_project_id", args.scope_project_id);
  withNull("scope_program_id", args.scope_program_id);
  const { data: existing } = await q.maybeSingle();

  if (existing) {
    const newNative = Number(existing.balance_native) + args.add_native;
    const newBase = Number(existing.balance_base) + args.add_base;
    const { data: upd, error } = await supabase
      .from("donor_pools")
      .update({
        balance_native: newNative,
        balance_base: newBase,
        last_fx_rate: args.fx_rate,
        last_fx_at: args.fx_at,
      })
      .eq("id", existing.id)
      .select("id, balance_native, balance_base")
      .single();
    if (error) throw error;
    return upd;
  }

  const { data: ins, error } = await supabase
    .from("donor_pools")
    .insert({
      organization_id: args.organization_id,
      donor_account_id: args.donor_account_id,
      scope: args.scope,
      scope_beneficiary_id: args.scope_beneficiary_id,
      scope_project_id: args.scope_project_id,
      scope_program_id: args.scope_program_id,
      currency: args.currency,
      balance_native: args.add_native,
      balance_base: args.add_base,
      last_fx_rate: args.fx_rate,
      last_fx_at: args.fx_at,
    })
    .select("id, balance_native, balance_base")
    .single();
  if (error) throw error;
  return ins;
}

async function decrementPool(
  supabase: SupabaseClient,
  poolId: string,
  native: number,
  base: number,
) {
  const { data: cur } = await supabase
    .from("donor_pools")
    .select("balance_native, balance_base")
    .eq("id", poolId)
    .single();
  if (!cur) return;
  const { error } = await supabase
    .from("donor_pools")
    .update({
      balance_native: Number(cur.balance_native) - native,
      balance_base: Number(cur.balance_base) - base,
    })
    .eq("id", poolId);
  if (error) throw error;
}

// --- ALLOCATE DONATION --------------------------------------------------
async function allocateDonation(supabase: SupabaseClient, donationId: string, actorId: string | null) {
  const { data: donation, error: dErr } = await supabase
    .from("donations")
    .select("id, organization_id, donor_account_id, donation_intent_id, amount, currency, completed_at")
    .eq("id", donationId)
    .maybeSingle();
  if (dErr) throw dErr;
  if (!donation) return json(404, { error: "donation_not_found" });
  if (!donation.donor_account_id) {
    return json(400, { error: "donation_missing_donor_account", message: "Donation has no donor_account_id — cannot allocate." });
  }
  if (!donation.amount || Number(donation.amount) <= 0) {
    return json(400, { error: "invalid_amount" });
  }

  const orgId = donation.organization_id as string;
  const nativeCur = (donation.currency || "KES").toUpperCase();
  const baseCur = await getBaseCurrency(supabase, orgId);
  const { rate: fxRate, at: fxAtSrc } = await getFxRate(supabase, nativeCur, baseCur);
  const fxAt = new Date().toISOString(); // capture at allocation time
  const amountNative = Number(donation.amount);
  const amountBase = amountNative * fxRate;

  // Intent — defaults to unrestricted
  let intent: any = null;
  if (donation.donation_intent_id) {
    const { data } = await supabase
      .from("donation_intents")
      .select("*")
      .eq("id", donation.donation_intent_id)
      .maybeSingle();
    intent = data;
  }
  const kind: string = intent?.kind ?? "unrestricted";

  const allocations: any[] = [];

  // Decide scope + pool
  let scope: "direct_beneficiary" | "project_pool" | "program_unrestricted";
  let scopeBen: string | null = null;
  let scopeProj: string | null = null;
  let scopeProg: string | null = null;

  if (kind === "beneficiary" && intent?.target_beneficiary_id && intent?.lock_to_beneficiary !== false) {
    scope = "direct_beneficiary";
    scopeBen = intent.target_beneficiary_id;
  } else if (kind === "project" && intent?.target_project_id) {
    scope = "project_pool";
    scopeProj = intent.target_project_id;
  } else {
    scope = "program_unrestricted";
    scopeProg = intent?.target_program_id ?? null;
  }

  // 1) Credit pool
  const pool = await upsertPool(supabase, {
    organization_id: orgId,
    donor_account_id: donation.donor_account_id,
    scope, scope_beneficiary_id: scopeBen, scope_project_id: scopeProj, scope_program_id: scopeProg,
    currency: nativeCur,
    add_native: amountNative, add_base: amountBase,
    fx_rate: fxRate, fx_at: fxAt,
  });

  // 2) Eager allocation
  if (scope === "direct_beneficiary") {
    // Passthrough: full allocation to the beneficiary, decrement pool
    const { data: alloc, error } = await supabase
      .from("allocations")
      .insert({
        organization_id: orgId,
        donor_pool_id: pool!.id,
        donor_account_id: donation.donor_account_id,
        donation_id: donation.id,
        beneficiary_id: scopeBen,
        project_id: null,
        program_id: intent?.target_program_id ?? null,
        scope,
        amount_native: amountNative,
        native_currency: nativeCur,
        fx_rate: fxRate,
        fx_at: fxAt,
        amount_base: amountBase,
        base_currency: baseCur,
        status: "active",
        allocated_by: actorId,
      })
      .select("*")
      .single();
    if (error) throw error;
    await decrementPool(supabase, pool!.id, amountNative, amountBase);
    allocations.push(alloc);
  } else if (scope === "project_pool") {
    // Rank active enrolled beneficiaries in the project; allocate until pool empty
    const { data: enrolled } = await supabase
      .from("beneficiary_services")
      .select("beneficiary_id, created_at")
      .eq("organization_id", orgId)
      .eq("project_id", scopeProj!)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    // Per-beneficiary cap from project metadata (optional)
    const { data: proj } = await supabase
      .from("projects")
      .select("id, program_id")
      .eq("id", scopeProj!)
      .maybeSingle();
    const perBenCap: number | null = null; // unlimited by default

    // Try to use risk-derived need_score: beneficiary_risk_scores.overall_risk DESC
    const benIds = Array.from(new Set((enrolled ?? []).map((e: any) => e.beneficiary_id).filter(Boolean)));
    let ordered: string[] = benIds;
    if (benIds.length > 0) {
      const { data: risks } = await supabase
        .from("beneficiary_risk_scores")
        .select("beneficiary_id, overall_risk")
        .in("beneficiary_id", benIds);
      const riskMap = new Map<string, number>();
      (risks ?? []).forEach((r: any) => riskMap.set(r.beneficiary_id, Number(r.overall_risk ?? 0)));
      ordered = [...benIds].sort((a, b) => (riskMap.get(b) ?? 0) - (riskMap.get(a) ?? 0));
    }

    let remainingNative = amountNative;
    let remainingBase = amountBase;
    for (const bId of ordered) {
      if (remainingNative <= 0.0000001) break;
      const slice = perBenCap ? Math.min(perBenCap, remainingNative) : remainingNative; // distribute fully when no cap
      // With no cap, the first beneficiary in queue receives full remaining pool —
      // not desirable. Instead default to equal split when no explicit cap.
      const sliceNative = perBenCap ? slice : amountNative / ordered.length;
      const finalSlice = Math.min(sliceNative, remainingNative);
      const finalBase = finalSlice * fxRate;
      const { data: alloc, error } = await supabase
        .from("allocations")
        .insert({
          organization_id: orgId,
          donor_pool_id: pool!.id,
          donor_account_id: donation.donor_account_id,
          donation_id: donation.id,
          beneficiary_id: bId,
          project_id: scopeProj,
          program_id: proj?.program_id ?? null,
          scope,
          amount_native: finalSlice,
          native_currency: nativeCur,
          fx_rate: fxRate,
          fx_at: fxAt,
          amount_base: finalBase,
          base_currency: baseCur,
          status: "active",
          allocated_by: actorId,
        })
        .select("*")
        .single();
      if (error) throw error;
      allocations.push(alloc);
      await decrementPool(supabase, pool!.id, finalSlice, finalBase);
      remainingNative -= finalSlice;
      remainingBase -= finalBase;
    }
    // Any remainder stays in the pool (no enrolled beneficiaries case)
  } else {
    // program_unrestricted: held in pool, no auto-distribution
  }

  const { data: poolAfter } = await supabase
    .from("donor_pools")
    .select("id, balance_native, balance_base, currency")
    .eq("id", pool!.id)
    .single();

  return json(200, {
    success: true,
    allocations,
    poolBalanceAfter: poolAfter,
    fxRate,
    fxAt,
    scope,
    intentKind: kind,
  });
}

// --- EXIT BENEFICIARY ---------------------------------------------------
async function exitBeneficiary(
  supabase: SupabaseClient,
  args: { beneficiaryId: string; projectId: string; resolution: "redirect" | "hold"; redirectBeneficiaryId?: string; reason: string },
  actorId: string | null,
) {
  if (!args.beneficiaryId || !args.projectId) return json(400, { error: "missing_args" });
  if (!args.reason || args.reason.trim().length < 3) return json(400, { error: "reason_required" });
  if (args.resolution === "redirect" && !args.redirectBeneficiaryId) {
    return json(400, { error: "redirect_target_required" });
  }

  const { data: actives, error } = await supabase
    .from("allocations")
    .select("*")
    .eq("beneficiary_id", args.beneficiaryId)
    .eq("project_id", args.projectId)
    .eq("status", "active");
  if (error) throw error;
  if (!actives || actives.length === 0) {
    return json(200, { success: true, affected: 0, message: "No active allocations to resolve." });
  }

  const results: any[] = [];
  for (const a of actives) {
    const beforeStatus = a.status;
    const beforeBen = a.beneficiary_id;
    let afterStatus: string;
    let afterBen: string | null = beforeBen;
    let childAllocation: any = null;

    if (args.resolution === "redirect") {
      // Mark original as redirected
      const { error: uErr } = await supabase
        .from("allocations")
        .update({ status: "redirected", reason: args.reason })
        .eq("id", a.id);
      if (uErr) throw uErr;
      afterStatus = "redirected";

      // Create child allocation for the redirect target
      const { data: child, error: cErr } = await supabase
        .from("allocations")
        .insert({
          organization_id: a.organization_id,
          donor_pool_id: a.donor_pool_id,
          donor_account_id: a.donor_account_id,
          donation_id: a.donation_id,
          beneficiary_id: args.redirectBeneficiaryId,
          project_id: a.project_id,
          program_id: a.program_id,
          scope: a.scope,
          amount_native: a.amount_native,
          native_currency: a.native_currency,
          fx_rate: a.fx_rate,
          fx_at: a.fx_at,
          amount_base: a.amount_base,
          base_currency: a.base_currency,
          status: "active",
          reason: `Redirected from beneficiary ${a.beneficiary_id}: ${args.reason}`,
          allocated_by: actorId,
          parent_allocation_id: a.id,
        })
        .select("*")
        .single();
      if (cErr) throw cErr;
      childAllocation = child;
      afterBen = args.redirectBeneficiaryId!;
    } else {
      // hold: mark held, re-credit the project pool (NEVER refund)
      const { error: uErr } = await supabase
        .from("allocations")
        .update({ status: "held", reason: args.reason })
        .eq("id", a.id);
      if (uErr) throw uErr;
      afterStatus = "held";
      // Re-credit the donor pool that originated this allocation
      const { data: cur } = await supabase
        .from("donor_pools")
        .select("balance_native, balance_base")
        .eq("id", a.donor_pool_id)
        .single();
      if (cur) {
        await supabase
          .from("donor_pools")
          .update({
            balance_native: Number(cur.balance_native) + Number(a.amount_native),
            balance_base: Number(cur.balance_base) + Number(a.amount_base),
          })
          .eq("id", a.donor_pool_id);
      }
    }

    // Log the override
    if (actorId) {
      await supabase.from("allocation_overrides").insert({
        organization_id: a.organization_id,
        allocation_id: a.id,
        overridden_by: actorId,
        reason: args.reason,
        before_status: beforeStatus,
        after_status: afterStatus,
        before_beneficiary_id: beforeBen,
        after_beneficiary_id: afterBen,
      });
    }

    results.push({ allocation_id: a.id, after_status: afterStatus, child_allocation: childAllocation });
  }

  return json(200, { success: true, affected: results.length, results });
}

// --- REQUEST HANDLER ----------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve calling user (best-effort, used as allocated_by)
    let actorId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        actorId = data?.user?.id ?? null;
      } catch (_) { /* anonymous / service call */ }
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode;

    if (mode === "allocate_donation") {
      if (!body.donationId) return json(400, { error: "donationId_required" });
      return await allocateDonation(supabase, body.donationId, actorId);
    }
    if (mode === "exit_beneficiary") {
      return await exitBeneficiary(supabase, {
        beneficiaryId: body.beneficiaryId,
        projectId: body.projectId,
        resolution: body.resolution,
        redirectBeneficiaryId: body.redirectBeneficiaryId,
        reason: body.reason,
      }, actorId);
    }
    return json(400, { error: "unknown_mode", message: "mode must be 'allocate_donation' or 'exit_beneficiary'" });
  } catch (err) {
    console.error("allocation-engine error:", err);
    return json(500, { error: "internal_error", message: (err as Error).message });
  }
});