// Donor money-flow: returns sankey-style nodes/links and per-period breakdown.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

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
      from?: string;
      to?: string;
      project_id?: string;
    };

    let donorAccountId = body.donor_account_id;
    if (!donorAccountId) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data: ures } = await supabase.auth.getUser(token);
      const uid = ures?.user?.id;
      if (!uid) {
        return new Response(JSON.stringify({ ok: false, message: "Unauthorized" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: acct } = await supabase
        .from("donor_accounts").select("id, donor_name, organization_id")
        .eq("user_id", uid).eq("is_active", true).maybeSingle();
      donorAccountId = acct?.id;
    }
    if (!donorAccountId) {
      return new Response(JSON.stringify({ ok: true, nodes: [], links: [], totals: {} }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: donor } = await supabase.from("donor_accounts")
      .select("id, donor_name").eq("id", donorAccountId).maybeSingle();

    let q = supabase.from("allocations")
      .select("id, scope, amount_base, base_currency, allocated_at, beneficiary_id, project_id, program_id, donor_pool_id")
      .eq("donor_account_id", donorAccountId);
    if (body.from) q = q.gte("allocated_at", body.from);
    if (body.to) q = q.lte("allocated_at", body.to);
    if (body.project_id) q = q.eq("project_id", body.project_id);
    const { data: allocs, error } = await q;
    if (error) throw error;

    const projIds = new Set<string>();
    const benIds = new Set<string>();
    const poolIds = new Set<string>();
    (allocs || []).forEach((a: any) => {
      a.project_id && projIds.add(a.project_id);
      a.beneficiary_id && benIds.add(a.beneficiary_id);
      a.donor_pool_id && poolIds.add(a.donor_pool_id);
    });

    const [{ data: projects }, { data: bens }, { data: pools }] = await Promise.all([
      projIds.size ? supabase.from("projects").select("id, name").in("id", Array.from(projIds)) : Promise.resolve({ data: [] }),
      benIds.size ? supabase.from("beneficiaries").select("id, display_name, grade, date_of_birth").in("id", Array.from(benIds)) : Promise.resolve({ data: [] }),
      poolIds.size ? supabase.from("donor_pools").select("id, scope, currency").in("id", Array.from(poolIds)) : Promise.resolve({ data: [] }),
    ]);
    const projMap = new Map<string, any>((projects || []).map((p: any) => [p.id, p]));
    const benMap = new Map<string, any>((bens || []).map((b: any) => [b.id, b]));
    const poolMap = new Map<string, any>((pools || []).map((p: any) => [p.id, p]));

    // Anonymization at beneficiary level
    function label(b: any) {
      if (!b) return "Unassigned";
      if (b.grade) return `Student · ${b.grade}`;
      if (b.date_of_birth) {
        const yrs = Math.floor((Date.now() - new Date(b.date_of_birth).getTime()) / (365.25 * 86400_000));
        if (yrs < 5) return "Child · under 5";
        if (yrs < 12) return "Child";
        if (yrs < 18) return "Youth";
        return "Adult participant";
      }
      return "Participant";
    }

    // Aggregate flows: donor -> pool -> project -> beneficiary(or "general")
    const nodes = new Map<string, { id: string; label: string; group: string }>();
    const links = new Map<string, { source: string; target: string; value: number }>();
    const donorId = `donor:${donor?.id}`;
    nodes.set(donorId, { id: donorId, label: donor?.donor_name || "You", group: "donor" });

    function addLink(s: string, t: string, v: number) {
      const k = `${s}__${t}`;
      const ex = links.get(k);
      if (ex) ex.value += v;
      else links.set(k, { source: s, target: t, value: v });
    }

    let total = 0;
    const projAttr = new Map<string, number>();
    for (const a of allocs || []) {
      const amt = Number(a.amount_base ?? 0);
      if (amt <= 0) continue;
      total += amt;
      const poolNodeId = a.donor_pool_id ? `pool:${a.donor_pool_id}` : `pool:general`;
      const poolLabel = a.donor_pool_id
        ? `${(poolMap.get(a.donor_pool_id)?.scope ?? "Pool")} pool`
        : "General pool";
      nodes.set(poolNodeId, { id: poolNodeId, label: poolLabel, group: "pool" });
      addLink(donorId, poolNodeId, amt);

      const projNodeId = a.project_id ? `proj:${a.project_id}` : "proj:unassigned";
      const projLabel = a.project_id ? (projMap.get(a.project_id)?.name || "Project") : "Unassigned project";
      nodes.set(projNodeId, { id: projNodeId, label: projLabel, group: "project" });
      addLink(poolNodeId, projNodeId, amt);
      if (a.project_id) projAttr.set(a.project_id, (projAttr.get(a.project_id) ?? 0) + amt);

      const benNodeId = a.beneficiary_id ? `ben:${a.beneficiary_id}` : `${projNodeId}:general`;
      const benLabel = a.beneficiary_id ? label(benMap.get(a.beneficiary_id)) : "Project-wide";
      nodes.set(benNodeId, { id: benNodeId, label: benLabel, group: "beneficiary" });
      addLink(projNodeId, benNodeId, amt);
    }

    return new Response(JSON.stringify({
      ok: true,
      nodes: Array.from(nodes.values()),
      links: Array.from(links.values()),
      totals: {
        allocated: Math.round(total),
        currency: "KES",
        projects: Array.from(projAttr.entries()).map(([id, amt]) => ({
          id, name: projMap.get(id)?.name || "Project", amount: Math.round(amt),
        })).sort((a, b) => b.amount - a.amount),
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: String(e?.message ?? e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});