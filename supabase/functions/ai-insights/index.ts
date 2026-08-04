import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages, organizationId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let orgContext = "";
    if (organizationId) {
      // Fetch ALL relevant tables in parallel for comprehensive context
      const [
        { data: beneficiaries },
        { data: programs },
        { data: projects },
        { data: expenses },
        { data: staff },
        { data: activities },
        { data: donors },
        { data: services },
        { data: academics },
        { data: visitations },
        { data: riskScores },
        { data: financialTx },
        { data: grants },
        { data: indicators },
        { data: indicatorData },
        { data: progressLogs },
      ] = await Promise.all([
        supabase.from("beneficiaries")
          .select("id, display_name, beneficiary_type, status, gender, location, county, grade, academic_level, institution_name, has_special_needs, hiv_status, date_of_birth, funding_required, amount_given, created_at")
          .eq("organization_id", organizationId).limit(1000),
        supabase.from("programs")
          .select("id, name, category, status, is_active, start_date, end_date, target_population, created_at")
          .eq("organization_id", organizationId),
        supabase.from("projects")
          .select("id, name, status, budget, start_date, end_date, program_id")
          .eq("organization_id", organizationId),
        supabase.from("expenses")
          .select("id, title, description, amount, category, expense_date, status, program_id, project_id, payment_method, currency")
          .eq("organization_id", organizationId).order("expense_date", { ascending: false }).limit(500),
        supabase.from("organization_members")
          .select("user_id, role, is_primary, created_at")
          .eq("organization_id", organizationId),
        supabase.from("activities")
          .select("id, title, status, activity_date, program_id, project_id, actual_participants, expected_participants, activity_type, location")
          .eq("organization_id", organizationId).order("activity_date", { ascending: false }).limit(500),
        supabase.from("beneficiary_donors")
          .select("id, beneficiary_id, donor_name, amount_received, program_id, donation_date, notes")
          .eq("organization_id", organizationId).limit(500),
        supabase.from("beneficiary_services")
          .select("beneficiary_id, program_id, project_id, project_name, status, enrolled_date, exit_date")
          .eq("organization_id", organizationId).limit(1000),
        supabase.from("beneficiary_academics")
          .select("beneficiary_id, academic_year, term, total_marks, out_of, overall_grade, position, remarks")
          .eq("organization_id", organizationId).order("academic_year", { ascending: false }).limit(500),
        supabase.from("beneficiary_visitations")
          .select("beneficiary_id, visit_date, visit_type, observation_findings, challenges_identified, recommendations, follow_up_required, staff_name, location")
          .eq("organization_id", organizationId).order("visit_date", { ascending: false }).limit(300),
        supabase.from("beneficiary_risk_scores")
          .select("beneficiary_id, overall_risk_level, dropout_risk_score, academic_trend_score, engagement_score, vulnerability_index, risk_flags, assessment_date")
          .eq("organization_id", organizationId).limit(500),
        supabase.from("financial_transactions")
          .select("id, transaction_type, amount, currency, transaction_date, donor_name, program_id, beneficiary_id, funding_category, description")
          .eq("organization_id", organizationId).order("transaction_date", { ascending: false }).limit(500),
        supabase.from("grants")
          .select("id, name, donor_name, total_amount, disbursed_amount, status, start_date, end_date, grant_type")
          .eq("organization_id", organizationId),
        supabase.from("indicators")
          .select("id, name, unit, category, target_value, baseline_value, current_value, program_id, is_active")
          .eq("organization_id", organizationId),
        supabase.from("indicator_data")
          .select("indicator_id, value, period_start, period_end, notes")
          .eq("organization_id", organizationId).order("period_start", { ascending: false }).limit(500),
        supabase.from("beneficiary_progress_logs")
          .select("beneficiary_id, title, category, description, progress_value, previous_value, log_date")
          .eq("organization_id", organizationId).order("log_date", { ascending: false }).limit(200),
      ]);

      // ── Compute derived metrics ──
      const activeBeneficiaries = beneficiaries?.filter(b => b.status === "active") || [];
      const totalExpenseAmount = expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0;
      const totalDonorFunding = donors?.reduce((s, d) => s + (d.amount_received || 0), 0) || 0;
      const totalGrantFunding = grants?.reduce((s, g) => s + (g.total_amount || 0), 0) || 0;
      const totalGrantDisbursed = grants?.reduce((s, g) => s + (g.disbursed_amount || 0), 0) || 0;

      // Gender distribution
      const genderDist: Record<string, number> = {};
      beneficiaries?.forEach(b => { genderDist[b.gender || "unknown"] = (genderDist[b.gender || "unknown"] || 0) + 1; });

      // Location distribution
      const locationDist: Record<string, number> = {};
      beneficiaries?.forEach(b => { const loc = b.county || b.location || "unknown"; locationDist[loc] = (locationDist[loc] || 0) + 1; });

      // Type distribution
      const typeDist: Record<string, number> = {};
      beneficiaries?.forEach(b => { typeDist[b.beneficiary_type] = (typeDist[b.beneficiary_type] || 0) + 1; });

      // Expenses by category
      const expByCat: Record<string, number> = {};
      expenses?.forEach(e => { const cat = e.category || "uncategorized"; expByCat[cat] = (expByCat[cat] || 0) + (e.amount || 0); });

      // Per-program metrics
      const programMetrics = programs?.map(p => {
        const pProjects = projects?.filter(pr => pr.program_id === p.id) || [];
        const pActivities = activities?.filter(a => a.program_id === p.id) || [];
        const pExpenses = expenses?.filter(e => e.program_id === p.id) || [];
        const pDonors = donors?.filter(d => d.program_id === p.id) || [];
        const pEnrollments = services?.filter(s => s.program_id === p.id && s.status === "active") || [];
        const pIndicators = indicators?.filter(ind => ind.program_id === p.id) || [];
        const pGrants = grants?.filter(g => {
          // check grant_programs join - simplified
          return false;
        }) || [];
        return {
          name: p.name, category: p.category, status: p.status, isActive: p.is_active,
          targetPopulation: p.target_population, startDate: p.start_date, endDate: p.end_date,
          projectCount: pProjects.length,
          totalProjectBudget: pProjects.reduce((s, pr) => s + (pr.budget || 0), 0),
          activityCount: pActivities.length,
          completedActivities: pActivities.filter(a => a.status === "completed").length,
          totalParticipants: pActivities.reduce((s, a) => s + (a.actual_participants || 0), 0),
          totalSpent: pExpenses.reduce((s, e) => s + (e.amount || 0), 0),
          totalDonorFunding: pDonors.reduce((s, d) => s + (d.amount_received || 0), 0),
          donorNames: [...new Set(pDonors.map(d => d.donor_name))],
          enrolledBeneficiaries: pEnrollments.length,
          indicators: pIndicators.map(i => ({
            name: i.name, target: i.target_value, current: i.current_value, baseline: i.baseline_value, unit: i.unit,
          })),
        };
      });

      // Donor summary
      const donorSummary: Record<string, { total: number; count: number; programs: Set<string> }> = {};
      donors?.forEach(d => {
        if (!donorSummary[d.donor_name]) donorSummary[d.donor_name] = { total: 0, count: 0, programs: new Set() };
        donorSummary[d.donor_name].total += (d.amount_received || 0);
        donorSummary[d.donor_name].count++;
        if (d.program_id) donorSummary[d.donor_name].programs.add(d.program_id);
      });
      const donorList = Object.entries(donorSummary).map(([name, d]) => ({
        name, totalGiven: d.total, donations: d.count, programsSupported: d.programs.size,
      })).sort((a, b) => b.totalGiven - a.totalGiven);

      // Academic performance summary
      const academicSummary = {
        totalRecords: academics?.length || 0,
        avgScore: academics && academics.length > 0
          ? (academics.filter(a => a.total_marks && a.out_of).reduce((s, a) => s + ((a.total_marks || 0) / (a.out_of || 1) * 100), 0) / (academics.filter(a => a.total_marks && a.out_of).length || 1)).toFixed(1)
          : "N/A",
        gradeDistribution: (() => {
          const dist: Record<string, number> = {};
          academics?.forEach(a => { if (a.overall_grade) dist[a.overall_grade] = (dist[a.overall_grade] || 0) + 1; });
          return dist;
        })(),
      };

      // Risk summary
      const riskSummary = {
        total: riskScores?.length || 0,
        high: riskScores?.filter(r => r.overall_risk_level === "high").length || 0,
        medium: riskScores?.filter(r => r.overall_risk_level === "medium").length || 0,
        low: riskScores?.filter(r => r.overall_risk_level === "low").length || 0,
        avgDropoutRisk: riskScores && riskScores.length > 0
          ? (riskScores.reduce((s, r) => s + (r.dropout_risk_score || 0), 0) / riskScores.length).toFixed(1)
          : "N/A",
      };

      // Sponsorship / funding coverage
      const totalFundingRequired = beneficiaries?.reduce((s, b) => s + (b.funding_required || 0), 0) || 0;
      const totalAmountGiven = beneficiaries?.reduce((s, b) => s + (b.amount_given || 0), 0) || 0;
      const fundingCoverage = totalFundingRequired > 0 ? ((totalAmountGiven / totalFundingRequired) * 100).toFixed(1) : "N/A";

      // Visitation summary
      const visitSummary = {
        totalVisits: visitations?.length || 0,
        followUpRequired: visitations?.filter(v => v.follow_up_required).length || 0,
        byType: (() => {
          const dist: Record<string, number> = {};
          visitations?.forEach(v => { dist[v.visit_type] = (dist[v.visit_type] || 0) + 1; });
          return dist;
        })(),
        recentChallenges: visitations?.filter(v => v.challenges_identified).slice(0, 10).map(v => ({
          date: v.visit_date, type: v.visit_type, challenge: v.challenges_identified, recommendation: v.recommendations,
        })),
      };

      // Financial transactions summary
      const txByType: Record<string, number> = {};
      financialTx?.forEach(tx => { txByType[tx.transaction_type] = (txByType[tx.transaction_type] || 0) + (tx.amount || 0); });

      // Grant summary
      const grantSummary = grants?.map(g => ({
        name: g.name, donor: g.donor_name, total: g.total_amount, disbursed: g.disbursed_amount,
        status: g.status, type: g.grant_type, period: `${g.start_date} to ${g.end_date}`,
        utilizationPct: g.total_amount ? ((g.disbursed_amount || 0) / g.total_amount * 100).toFixed(1) : "0",
      }));

      // Indicator progress
      const indicatorSummary = indicators?.map(i => {
        const recentData = indicatorData?.filter(d => d.indicator_id === i.id).slice(0, 5) || [];
        return {
          name: i.name, unit: i.unit, category: i.category,
          target: i.target_value, baseline: i.baseline_value, current: i.current_value,
          achievementPct: i.target_value ? ((i.current_value || 0) / i.target_value * 100).toFixed(1) : "N/A",
          recentValues: recentData.map(d => ({ value: d.value, period: d.period_start })),
        };
      });

      const costPerBeneficiary = activeBeneficiaries.length > 0 ? (totalExpenseAmount / activeBeneficiaries.length).toFixed(2) : "N/A";

      orgContext = `
## LIVE Organization Data (fetched ${new Date().toISOString()})

### Key Metrics
- **Beneficiaries**: ${beneficiaries?.length || 0} total (${activeBeneficiaries.length} active)
- **Gender**: ${JSON.stringify(genderDist)}
- **Locations**: ${JSON.stringify(locationDist)}
- **Types**: ${JSON.stringify(typeDist)}
- **Programs**: ${programs?.length || 0} total (${programs?.filter(p => p.is_active).length || 0} active)
- **Projects**: ${projects?.length || 0} (Total budget: ${(projects?.reduce((s, p) => s + (p.budget || 0), 0) || 0).toLocaleString()})
- **Staff**: ${staff?.length || 0}
- **Activities**: ${activities?.length || 0} (Completed: ${activities?.filter(a => a.status === "completed").length || 0})
- **Total Participants Reached**: ${activities?.reduce((s, a) => s + (a.actual_participants || 0), 0) || 0}
- **Cost per Active Beneficiary**: ${costPerBeneficiary}

### Financial Overview
- **Total Expenses**: ${totalExpenseAmount.toLocaleString()}
- **Expenses by Category**: ${JSON.stringify(expByCat)}
- **Total Donor Funding**: ${totalDonorFunding.toLocaleString()}
- **Total Grant Funding**: ${totalGrantFunding.toLocaleString()} (Disbursed: ${totalGrantDisbursed.toLocaleString()})
- **Financial Transactions by Type**: ${JSON.stringify(txByType)}
- **Sponsorship Coverage**: ${fundingCoverage}% (Required: ${totalFundingRequired.toLocaleString()}, Given: ${totalAmountGiven.toLocaleString()})

### Program Performance
${JSON.stringify(programMetrics, null, 2)}

### Donor Analysis
${JSON.stringify(donorList, null, 2)}

### Grant Status
${JSON.stringify(grantSummary, null, 2)}

### Academic Performance
- Total Records: ${academicSummary.totalRecords}
- Average Score: ${academicSummary.avgScore}%
- Grade Distribution: ${JSON.stringify(academicSummary.gradeDistribution)}

### Risk Assessment
- Total Assessed: ${riskSummary.total}
- High Risk: ${riskSummary.high}, Medium: ${riskSummary.medium}, Low: ${riskSummary.low}
- Average Dropout Risk Score: ${riskSummary.avgDropoutRisk}

### Visitation & Field Activity
- Total Visits: ${visitSummary.totalVisits}
- Follow-ups Required: ${visitSummary.followUpRequired}
- By Type: ${JSON.stringify(visitSummary.byType)}
- Recent Challenges: ${JSON.stringify(visitSummary.recentChallenges?.slice(0, 5))}

### M&E Indicators
${JSON.stringify(indicatorSummary, null, 2)}

### Recent Beneficiary Progress Logs
${JSON.stringify(progressLogs?.slice(0, 20), null, 2)}

### Recent Activities (last 20)
${JSON.stringify(activities?.slice(0, 20).map(a => ({ title: a.title, status: a.status, date: a.activity_date, type: a.activity_type, participants: a.actual_participants, location: a.location })), null, 2)}

### Recent Expenses (last 20)
${JSON.stringify(expenses?.slice(0, 20).map(e => ({ title: e.title, amount: e.amount, category: e.category, date: e.expense_date, status: e.status })), null, 2)}
`;
    }

    const systemPrompt = `You are ApexOS AI — an intelligent analytics assistant for an NGO data management platform. You have access to the organization's LIVE data pulled in real-time from the database.

Your capabilities:
- Answer questions about program performance, beneficiary demographics, financial analysis, and staff activity using REAL data
- Compare programs, identify underperforming areas, and highlight trends with actual numbers
- Provide cost analysis (cost per beneficiary, budget utilization, funding gaps)
- Surface risks, at-risk beneficiaries, and actionable recommendations
- Analyze donor patterns, grant utilization, and sponsorship coverage
- Review M&E indicator progress and academic performance trends
- Summarize field visit findings and challenges

Guidelines:
- ALWAYS base answers on the real data provided below — never make up numbers
- Use specific numbers, percentages, names, and comparisons from the data
- When data is insufficient, say so honestly and suggest what data to collect
- Format responses with markdown: headers, tables, bold text, bullet points
- Be concise but thorough — prioritize actionable insights
- If asked about something not in the data, explain what data would be needed
- Use a professional but approachable tone

${orgContext}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up your workspace usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
