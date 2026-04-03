import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { organization_id, report_type, description, evidence_description, is_anonymous, contact_info } = body;

    if (!organization_id || !report_type || !description) {
      return new Response(
        JSON.stringify({ error: "organization_id, report_type, and description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validTypes = ['financial_misconduct', 'fraud', 'harassment', 'conflict_of_interest', 'policy_violation', 'safeguarding', 'other'];
    if (!validTypes.includes(report_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid report type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // IMPORTANT: Do NOT log IP address for anonymous reports
    const insertData: Record<string, unknown> = {
      organization_id,
      report_type,
      description: description.substring(0, 10000),
      evidence_description: evidence_description ? evidence_description.substring(0, 5000) : null,
      is_anonymous: is_anonymous ?? true,
      status: "received",
    };

    // Only store contact info if NOT anonymous
    if (!is_anonymous && contact_info) {
      insertData.contact_info = contact_info;
    }

    const { data, error } = await supabase
      .from("whistleblower_reports")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to submit report" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, reference_id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
