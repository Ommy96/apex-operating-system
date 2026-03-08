import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, access_token, ...params } = body;

    if (!access_token) {
      return new Response(JSON.stringify({ error: "Access token required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify board member by token
    const { data: member, error: memberError } = await adminClient
      .from("board_members")
      .select("*")
      .eq("access_token", access_token)
      .eq("is_active", true)
      .maybeSingle();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Invalid access token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (member.token_expires_at && new Date(member.token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Token expired" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = member.organization_id;
    let result: any = null;

    switch (action) {
      case "get_reports": {
        const { data } = await adminClient
          .from("board_reports")
          .select("*")
          .eq("organization_id", orgId)
          .in("status", ["published", "in_review", "approved"])
          .order("created_at", { ascending: false });
        result = data;
        break;
      }

      case "get_report_sections": {
        const { data } = await adminClient
          .from("board_report_sections")
          .select("*")
          .eq("report_id", params.report_id)
          .eq("organization_id", orgId)
          .order("sort_order");
        result = data;
        break;
      }

      case "get_comments": {
        const { data } = await adminClient
          .from("board_report_comments")
          .select("*")
          .eq("report_id", params.report_id)
          .eq("organization_id", orgId)
          .order("created_at", { ascending: true });
        result = data;
        break;
      }

      case "get_approvals": {
        const { data } = await adminClient
          .from("board_report_approvals")
          .select("*, board_members(full_name)")
          .eq("report_id", params.report_id)
          .eq("organization_id", orgId);
        result = data;
        break;
      }

      case "get_action_items": {
        const { data } = await adminClient
          .from("board_action_items")
          .select("*, board_members(full_name)")
          .eq("report_id", params.report_id)
          .eq("organization_id", orgId)
          .order("created_at");
        result = data;
        break;
      }

      case "add_comment": {
        const { error } = await adminClient.from("board_report_comments").insert({
          report_id: params.report_id,
          section_id: params.section_id || null,
          organization_id: orgId,
          author_name: member.full_name,
          author_email: member.email,
          board_member_id: member.id,
          content: params.content,
        });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "submit_approval": {
        const { error } = await adminClient.from("board_report_approvals").upsert({
          report_id: params.report_id,
          organization_id: orgId,
          board_member_id: member.id,
          decision: params.decision,
          comments: params.comments || null,
        }, { onConflict: "report_id,board_member_id" });
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ data: result, member: { id: member.id, full_name: member.full_name, email: member.email, role: member.role, organization_id: orgId } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
