import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { organizationId } = await req.json();
    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organizationId required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Auth user + tenant check
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);

    // Tenant guard
    const { data: membership } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull org profile + curated sources
    const [{ data: org }, { data: programs }, { data: projects }, { data: sources }, { data: setupCfg }] = await Promise.all([
      admin.from("organizations").select("id, name, country, sector, setup_config").eq("id", organizationId).maybeSingle(),
      admin.from("programs").select("id, name, category, is_active, target_population").eq("organization_id", organizationId).limit(50),
      admin.from("projects").select("id, name, status, budget").eq("organization_id", organizationId).limit(50),
      admin.from("grant_sources").select("*").eq("organization_id", organizationId).is("deleted_at", null).eq("is_active", true).limit(100),
      admin.from("organizations").select("setup_config").eq("id", organizationId).maybeSingle(),
    ]);

    const orgProfile = {
      name: org?.name,
      country: org?.country,
      sector: (org as any)?.sector ?? (org as any)?.setup_config?.sector,
      sdg_focus: (org as any)?.setup_config?.sdg_focus ?? [],
      programs: programs?.map((p: any) => ({ name: p.name, category: p.category, target: p.target_population })) ?? [],
      activeProjectCount: projects?.filter((p: any) => p.status === "active").length ?? 0,
    };

    const seedList = (sources ?? []).map((s: any) => ({
      id: s.id, name: s.name, funder: s.funder_name, type: s.funder_type,
      sectors: s.sectors, geographies: s.geographies, sdg: s.sdg_focus,
      min: s.min_amount, max: s.max_amount, currency: s.currency,
      deadline: s.next_deadline, url: s.url, notes: s.eligibility_notes,
    }));

    const systemPrompt = `You are a grant discovery analyst for non-profits. Rank funding opportunities by fit with the organization. Respond with STRICT JSON only.`;
    const userPrompt = `Organization profile:\n${JSON.stringify(orgProfile, null, 2)}\n\nCurated grant sources to evaluate (if empty, propose well-known global grant programs that match the profile):\n${JSON.stringify(seedList, null, 2)}\n\nReturn JSON of shape:\n{ "opportunities": [ { "title": string, "funder_name": string, "summary": string, "match_score": 0-100, "match_reasons": [string], "estimated_amount": number|null, "currency": string, "deadline": "YYYY-MM-DD"|null, "url": string|null, "sectors": [string], "sdg_focus": [int], "source_id": string|null } ] }\nReturn 6-12 opportunities, sorted by match_score desc.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI error: ${errText.slice(0, 300)}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { opportunities: [] }; }
    const opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities : [];

    return new Response(
      JSON.stringify({
        opportunities,
        generatedAt: new Date().toISOString(),
        sourceCount: seedList.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});