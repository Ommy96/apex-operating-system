import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DOC_INSTRUCTIONS: Record<string, string> = {
  concept_note: "Produce a 1-2 page CONCEPT NOTE: Background, Problem, Proposed Intervention, Target Beneficiaries, Outcomes, Budget Estimate, Sustainability.",
  proposal: "Produce a FULL GRANT PROPOSAL with sections: Executive Summary, Organization Background, Problem Statement, Goal & Objectives, Theory of Change, Activities, Logframe (text), Risk Management, M&E Plan, Detailed Budget Narrative, Sustainability, Annexes.",
  donor_report: "Produce a DONOR REPORT covering Reporting Period, Activities Delivered vs Planned, Outputs/Outcomes with quantitative evidence, Beneficiary Stories (placeholders), Financial Summary, Challenges & Mitigations, Next Period Plan.",
  impact_summary: "Produce a concise IMPACT SUMMARY for stakeholders: Headline Impact Numbers, 3-5 Outcome Highlights, Beneficiary Voices (placeholders), Lessons Learned, Looking Ahead.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { organizationId, programId, projectId, grantId, opportunityId, documentType, title } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!organizationId || !documentType || !DOC_INSTRUCTIONS[documentType]) {
      return new Response(JSON.stringify({ error: "organizationId and valid documentType required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: membership } = await admin
      .from("organization_members").select("user_id")
      .eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Gather context
    const [{ data: org }, { data: program }, { data: project }, { data: grant }, { data: opportunity }, { data: indicators }] = await Promise.all([
      admin.from("organizations").select("name, country, sector, setup_config").eq("id", organizationId).maybeSingle(),
      programId ? admin.from("programs").select("name, category, target_population, start_date, end_date").eq("id", programId).maybeSingle() : Promise.resolve({ data: null }),
      projectId ? admin.from("projects").select("name, budget, start_date, end_date, status").eq("id", projectId).maybeSingle() : Promise.resolve({ data: null }),
      grantId ? admin.from("grants").select("name, donor_name, total_amount, start_date, end_date").eq("id", grantId).maybeSingle() : Promise.resolve({ data: null }),
      opportunityId ? admin.from("grant_opportunities").select("title, funder_name, summary, sectors, sdg_focus").eq("id", opportunityId).maybeSingle() : Promise.resolve({ data: null }),
      programId ? admin.from("indicators").select("name, unit, baseline_value, target_value, current_value").eq("program_id", programId).limit(30) : Promise.resolve({ data: [] }),
    ]);

    const ctx = { org, program, project, grant, opportunity, indicators };

    const systemPrompt = `You are a senior proposal writer for NGOs. Write professional, donor-grade documents in Markdown. Use clear headings (##), bullet lists, and tables where useful. Replace unknown data with [PLACEHOLDER: ...]. Be concrete and specific.`;
    const userPrompt = `${DOC_INSTRUCTIONS[documentType]}\n\nContext (organization, program, project, grant, opportunity, indicators):\n${JSON.stringify(ctx, null, 2)}\n\nTitle: ${title ?? "Draft"}\n\nReturn ONLY the markdown content of the document. No preamble.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI error: ${t.slice(0, 300)}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "";

    // Persist draft
    const { data: draft, error: insErr } = await admin
      .from("ai_document_drafts")
      .insert({
        organization_id: organizationId,
        document_type: documentType,
        title: title || `${documentType.replace("_", " ")} draft`,
        program_id: programId ?? null,
        project_id: projectId ?? null,
        grant_id: grantId ?? null,
        opportunity_id: opportunityId ?? null,
        content,
        model: "google/gemini-2.5-flash",
        created_by: userId,
        updated_by: userId,
      })
      .select("id, content, title, document_type")
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: `Save failed: ${insErr.message}`, content }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ draft, generatedAt: new Date().toISOString() }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});