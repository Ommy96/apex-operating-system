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
    if (!LOVABLE_API_KEY)
      throw new Error("LOVABLE_API_KEY is not configured");

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch org context data for the AI
    let orgContext = "";
    if (organizationId) {
      const [
        { data: beneficiaries },
        { data: programs },
        { data: projects },
        { data: expenses },
        { data: staff },
        { data: activities },
      ] = await Promise.all([
        supabase
          .from("beneficiaries")
          .select("id, display_name, beneficiary_type, status, gender, location, county, created_at")
          .eq("organization_id", organizationId)
          .limit(500),
        supabase
          .from("programs")
          .select("id, name, category, status, is_active, start_date, end_date, target_population, created_at")
          .eq("organization_id", organizationId),
        supabase
          .from("projects")
          .select("id, name, status, budget, start_date, end_date, program_id")
          .eq("organization_id", organizationId),
        supabase
          .from("expenses")
          .select("id, description, amount, category, expense_date, status, program_id, project_id")
          .eq("organization_id", organizationId)
          .limit(500),
        supabase
          .from("organization_members")
          .select("user_id, role, is_primary, created_at")
          .eq("organization_id", organizationId),
        supabase
          .from("activities")
          .select("id, title, status, activity_date, program_id, project_id, actual_participants, expected_participants")
          .eq("organization_id", organizationId)
          .limit(500),
      ]);

      // Compute summary stats
      const totalBeneficiaries = beneficiaries?.length || 0;
      const activeBeneficiaries = beneficiaries?.filter(b => b.status === "active").length || 0;
      const genderBreakdown: Record<string, number> = {};
      beneficiaries?.forEach(b => {
        const g = b.gender || "unknown";
        genderBreakdown[g] = (genderBreakdown[g] || 0) + 1;
      });
      const locationBreakdown: Record<string, number> = {};
      beneficiaries?.forEach(b => {
        const loc = b.county || b.location || "unknown";
        locationBreakdown[loc] = (locationBreakdown[loc] || 0) + 1;
      });
      const typeBreakdown: Record<string, number> = {};
      beneficiaries?.forEach(b => {
        typeBreakdown[b.beneficiary_type] = (typeBreakdown[b.beneficiary_type] || 0) + 1;
      });

      const totalPrograms = programs?.length || 0;
      const activePrograms = programs?.filter(p => p.is_active).length || 0;

      const totalProjects = projects?.length || 0;
      const totalBudget = projects?.reduce((s, p) => s + (p.budget || 0), 0) || 0;

      const totalExpenses = expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0;
      const expensesByCategory: Record<string, number> = {};
      expenses?.forEach(e => {
        const cat = e.category || "uncategorized";
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (e.amount || 0);
      });

      const totalStaff = staff?.length || 0;

      const totalActivities = activities?.length || 0;
      const completedActivities = activities?.filter(a => a.status === "completed").length || 0;
      const totalParticipants = activities?.reduce((s, a) => s + (a.actual_participants || 0), 0) || 0;

      const costPerBeneficiary = activeBeneficiaries > 0 ? (totalExpenses / activeBeneficiaries).toFixed(2) : "N/A";

      // Build programs detail
      const programDetails = programs?.map(p => {
        const progProjects = projects?.filter(pr => pr.program_id === p.id) || [];
        const progActivities = activities?.filter(a => a.program_id === p.id) || [];
        const progExpenses = expenses?.filter(e => e.program_id === p.id) || [];
        const progBeneficiaries = beneficiaries?.filter(b => b.status === "active").length || 0; // simplified
        return {
          name: p.name,
          category: p.category,
          status: p.status,
          is_active: p.is_active,
          target_population: p.target_population,
          projects_count: progProjects.length,
          activities_count: progActivities.length,
          completed_activities: progActivities.filter(a => a.status === "completed").length,
          total_spent: progExpenses.reduce((s, e) => s + (e.amount || 0), 0),
          total_participants: progActivities.reduce((s, a) => s + (a.actual_participants || 0), 0),
        };
      });

      orgContext = `
## Organization Data Context (live data as of ${new Date().toISOString()})

### Summary Statistics
- Total Beneficiaries: ${totalBeneficiaries} (Active: ${activeBeneficiaries})
- Gender Distribution: ${JSON.stringify(genderBreakdown)}
- Location Distribution: ${JSON.stringify(locationBreakdown)}
- Beneficiary Types: ${JSON.stringify(typeBreakdown)}
- Total Programs: ${totalPrograms} (Active: ${activePrograms})
- Total Projects: ${totalProjects}
- Total Budget Allocated: ${totalBudget.toLocaleString()}
- Total Expenses: ${totalExpenses.toLocaleString()}
- Expenses by Category: ${JSON.stringify(expensesByCategory)}
- Cost per Active Beneficiary: ${costPerBeneficiary}
- Staff Members: ${totalStaff}
- Total Activities: ${totalActivities} (Completed: ${completedActivities})
- Total Participants Reached: ${totalParticipants}

### Program Details
${JSON.stringify(programDetails, null, 2)}

### Recent Activities (last 20)
${JSON.stringify(activities?.slice(0, 20), null, 2)}
`;
    }

    const systemPrompt = `You are Ufanisi AI — an intelligent analytics assistant for a nonprofit/NGO data management platform called Ufanisi. You help organization staff understand their program performance, beneficiary data, financial metrics, and operational health.

Your capabilities:
- Answer questions about program performance, beneficiary demographics, financial analysis, and staff activity
- Compare programs, identify underperforming areas, and highlight trends
- Provide cost analysis (cost per beneficiary, budget utilization)
- Surface risks and recommendations
- Generate structured summaries with tables, bullet points, and key metrics

Guidelines:
- Always base your answers on the real data provided in the context
- Use specific numbers, percentages, and comparisons
- When data is insufficient, say so honestly
- Format responses with markdown: headers, tables, bold text, bullet points
- Be concise but thorough — prioritize actionable insights
- If asked about something not in the data, explain what data would be needed
- Use a professional but friendly tone

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
