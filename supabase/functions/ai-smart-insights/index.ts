import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { organizationId, insightType } = await req.json();
    // insightType: "beneficiary_risk" | "funding_gaps" | "donor_opportunities" | "all"

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!organizationId) throw new Error("organizationId is required");

    // Fetch all relevant data in parallel
    const [
      { data: beneficiaries },
      { data: academics },
      { data: riskScores },
      { data: programs },
      { data: projects },
      { data: expenses },
      { data: donors },
      { data: services },
      { data: visitations },
      { data: grantPrograms },
    ] = await Promise.all([
      supabase.from("beneficiaries")
        .select("id, display_name, beneficiary_type, status, gender, location, county, grade, academic_level, has_special_needs, hiv_status, date_of_birth, institution_name, created_at")
        .eq("organization_id", organizationId).limit(1000),
      supabase.from("beneficiary_academics")
        .select("beneficiary_id, academic_year, term, total_marks, out_of, overall_grade, position")
        .eq("organization_id", organizationId).limit(1000),
      supabase.from("beneficiary_risk_scores")
        .select("beneficiary_id, overall_risk_level, dropout_risk_score, academic_trend_score, engagement_score, vulnerability_index, risk_flags")
        .eq("organization_id", organizationId).limit(500),
      supabase.from("programs")
        .select("id, name, category, status, is_active, target_population, start_date, end_date")
        .eq("organization_id", organizationId),
      supabase.from("projects")
        .select("id, name, status, budget, start_date, end_date, program_id")
        .eq("organization_id", organizationId),
      supabase.from("expenses")
        .select("id, amount, category, expense_date, program_id, project_id, status")
        .eq("organization_id", organizationId).limit(1000),
      supabase.from("beneficiary_donors")
        .select("id, beneficiary_id, donor_name, amount_received, program_id, donation_date")
        .eq("organization_id", organizationId).limit(500),
      supabase.from("beneficiary_services")
        .select("beneficiary_id, program_id, project_id, status, enrolled_date, exit_date")
        .eq("organization_id", organizationId).limit(1000),
      supabase.from("beneficiary_visitations")
        .select("beneficiary_id, visit_date, visit_type, follow_up_required")
        .eq("organization_id", organizationId).limit(500),
      supabase.from("grant_programs")
        .select("grant_id, program_id, allocated_amount")
        .limit(200),
    ]);

    // Build context
    const activeBeneficiaries = beneficiaries?.filter(b => b.status === "active") || [];
    
    // Per-program spending
    const programSpending: Record<string, number> = {};
    expenses?.forEach(e => {
      if (e.program_id) programSpending[e.program_id] = (programSpending[e.program_id] || 0) + (e.amount || 0);
    });

    // Per-program donor funding
    const programDonorFunding: Record<string, { total: number; donors: Record<string, number> }> = {};
    donors?.forEach(d => {
      const pid = d.program_id || "unassigned";
      if (!programDonorFunding[pid]) programDonorFunding[pid] = { total: 0, donors: {} };
      programDonorFunding[pid].total += (d.amount_received || 0);
      programDonorFunding[pid].donors[d.donor_name] = (programDonorFunding[pid].donors[d.donor_name] || 0) + (d.amount_received || 0);
    });

    // Program enrollments
    const programEnrollments: Record<string, number> = {};
    services?.filter(s => s.status === "active").forEach(s => {
      if (s.program_id) programEnrollments[s.program_id] = (programEnrollments[s.program_id] || 0) + 1;
    });

    // Academic performance by beneficiary
    const academicByBeneficiary: Record<string, { avgScore: number; records: number; trend: string }> = {};
    academics?.forEach(a => {
      if (!academicByBeneficiary[a.beneficiary_id]) academicByBeneficiary[a.beneficiary_id] = { avgScore: 0, records: 0, trend: "stable" };
      const entry = academicByBeneficiary[a.beneficiary_id];
      if (a.total_marks && a.out_of) {
        entry.avgScore = ((entry.avgScore * entry.records) + (a.total_marks / a.out_of * 100)) / (entry.records + 1);
      }
      entry.records++;
    });

    // Visitation frequency
    const visitationCount: Record<string, number> = {};
    visitations?.forEach(v => {
      visitationCount[v.beneficiary_id] = (visitationCount[v.beneficiary_id] || 0) + 1;
    });

    const contextData = JSON.stringify({
      summary: {
        totalBeneficiaries: beneficiaries?.length || 0,
        activeBeneficiaries: activeBeneficiaries.length,
        totalPrograms: programs?.length || 0,
        activePrograms: programs?.filter(p => p.is_active).length || 0,
        totalExpenses: expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0,
        totalDonorFunding: donors?.reduce((s, d) => s + (d.amount_received || 0), 0) || 0,
      },
      beneficiaries: activeBeneficiaries.slice(0, 200).map(b => ({
        id: b.id,
        name: b.display_name,
        type: b.beneficiary_type,
        gender: b.gender,
        location: b.county || b.location,
        grade: b.grade,
        academicLevel: b.academic_level,
        specialNeeds: b.has_special_needs,
        hivStatus: b.hiv_status,
        dob: b.date_of_birth,
        institution: b.institution_name,
        academicPerformance: academicByBeneficiary[b.id] || null,
        riskScore: riskScores?.find(r => r.beneficiary_id === b.id) || null,
        visitationCount: visitationCount[b.id] || 0,
        enrolledPrograms: services?.filter(s => s.beneficiary_id === b.id && s.status === "active").map(s => s.program_id) || [],
      })),
      programs: programs?.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        status: p.status,
        isActive: p.is_active,
        targetPopulation: p.target_population,
        startDate: p.start_date,
        endDate: p.end_date,
        totalSpent: programSpending[p.id] || 0,
        projectBudget: projects?.filter(pr => pr.program_id === p.id).reduce((s, pr) => s + (pr.budget || 0), 0) || 0,
        enrolledBeneficiaries: programEnrollments[p.id] || 0,
        donorFunding: programDonorFunding[p.id] || { total: 0, donors: {} },
      })),
      donorSummary: Object.entries(
        donors?.reduce((acc, d) => {
          acc[d.donor_name] = acc[d.donor_name] || { totalGiven: 0, programs: new Set(), beneficiaries: new Set() };
          acc[d.donor_name].totalGiven += (d.amount_received || 0);
          if (d.program_id) acc[d.donor_name].programs.add(d.program_id);
          acc[d.donor_name].beneficiaries.add(d.beneficiary_id);
          return acc;
        }, {} as Record<string, any>) || {}
      ).map(([name, data]: [string, any]) => ({
        name,
        totalGiven: data.totalGiven,
        programCount: data.programs.size,
        beneficiaryCount: data.beneficiaries.size,
      })),
    });

    const systemPrompt = `You are an AI analytics engine for an NGO management platform. Analyze the organization data and produce structured recommendations using the provided tool.

Current date: ${new Date().toISOString().split("T")[0]}

ORGANIZATION DATA:
${contextData}

ANALYSIS INSTRUCTIONS:
1. For beneficiary_risk: Identify beneficiaries at risk based on low academic scores (<50%), no visitations, special needs without support, high dropout risk scores. Score 0-100 (higher=more risk). Suggest specific interventions.
2. For funding_gaps: Compare program spending vs budget vs donor funding. Flag programs where spending exceeds funding or funding is below 50% of budget. Calculate gaps.
3. For donor_opportunities: Cross-reference underfunded programs with existing donor patterns. Suggest which donors could fund which programs based on historical giving.

Always provide at least 3-5 items per category. Use real beneficiary names, program names, and donor names from the data. If data is insufficient for a category, provide fewer items with explanations.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_insights",
          description: "Generate structured AI insights for the NGO dashboard",
          parameters: {
            type: "object",
            properties: {
              beneficiaryRisks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    beneficiaryId: { type: "string" },
                    beneficiaryName: { type: "string" },
                    riskScore: { type: "number", description: "0-100, higher is more risky" },
                    riskLevel: { type: "string", enum: ["high", "medium", "low"] },
                    riskFactors: { type: "array", items: { type: "string" } },
                    suggestedIntervention: { type: "string", enum: ["academic_support", "counseling", "financial_support", "health_support", "mentorship", "family_support"] },
                    interventionReason: { type: "string" },
                    program: { type: "string" },
                    location: { type: "string" },
                  },
                  required: ["beneficiaryId", "beneficiaryName", "riskScore", "riskLevel", "riskFactors", "suggestedIntervention", "interventionReason"],
                },
              },
              fundingGaps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    programId: { type: "string" },
                    programName: { type: "string" },
                    totalBudget: { type: "number" },
                    totalFunding: { type: "number" },
                    totalSpent: { type: "number" },
                    fundingGap: { type: "number" },
                    utilizationPercent: { type: "number" },
                    beneficiariesImpacted: { type: "number" },
                    severity: { type: "string", enum: ["critical", "warning", "healthy"] },
                    recommendation: { type: "string" },
                    suggestedDonors: { type: "array", items: { type: "string" } },
                  },
                  required: ["programId", "programName", "totalBudget", "totalFunding", "fundingGap", "severity", "recommendation"],
                },
              },
              donorOpportunities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    donorName: { type: "string" },
                    programName: { type: "string" },
                    programId: { type: "string" },
                    potentialAmount: { type: "number" },
                    matchScore: { type: "number", description: "0-100 likelihood score" },
                    rationale: { type: "string" },
                    priorityLevel: { type: "string", enum: ["high", "medium", "low"] },
                    historicalContribution: { type: "number" },
                  },
                  required: ["donorName", "programName", "matchScore", "rationale", "priorityLevel"],
                },
              },
              executiveSummary: {
                type: "string",
                description: "2-3 sentence executive summary of the overall findings",
              },
            },
            required: ["beneficiaryRisks", "fundingGaps", "donorOpportunities", "executiveSummary"],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate comprehensive insights for this organization. Focus on: ${insightType || "all"}` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "generate_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No insights generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ insights, generatedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-smart-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
