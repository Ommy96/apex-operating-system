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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    const body = await req.json();
    const { user_id, organization_id } = body;

    if (!user_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (user_id === callerId) {
      return new Response(
        JSON.stringify({ error: "You cannot remove yourself from the organization" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin in the org or super admin
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("user_id", callerId)
      .eq("organization_id", organization_id)
      .maybeSingle();

    const isCallerOrgAdmin = membership?.role === "admin";

    const { data: isSuperAdmin } = await adminClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });

    if (!isCallerOrgAdmin && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Only organization admins can remove members" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Delete from organization_members
    await adminClient
      .from("organization_members")
      .delete()
      .eq("user_id", user_id)
      .eq("organization_id", organization_id);

    // 2. Delete from rbac_user_role_assignments
    await adminClient
      .from("rbac_user_role_assignments")
      .delete()
      .eq("user_id", user_id)
      .eq("organization_id", organization_id);

    // 3. Clear profile org reference
    await adminClient
      .from("profiles")
      .update({ organization_id: null })
      .eq("user_id", user_id);

    // 4. Delete the auth user entirely
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError.message);
      // Still return success for org removal — auth deletion is best-effort
      return new Response(
        JSON.stringify({ success: true, warning: "User removed from org but auth account deletion failed: " + deleteError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
