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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: authError } = await callerClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, full_name, role, organization_id,
      // New staff detail fields
      phone, national_id, date_of_birth, gender, county,
      job_title, department, employment_type, start_date, staff_id, notes,
      // RBAC role assignment
      rbac_role_id
    } = body;

    if (!email || !password || !full_name || !organization_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, full_name, organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin in the org or super admin
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("organization_id", organization_id)
      .maybeSingle();

    const isCallerOrgAdmin = membership?.role === "admin";

    const { data: isSuperAdmin } = await adminClient.rpc("has_role", {
      _user_id: callerUser.id,
      _role: "admin",
    });

    if (!isCallerOrgAdmin && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Only organization admins can create members" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user via admin API (doesn't affect caller's session)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add as organization member
    const memberRole = role || "member";
    const { error: memberError } = await adminClient.from("organization_members").insert({
      user_id: newUser.user.id,
      organization_id,
      role: memberRole,
      is_primary: true,
      invited_by: callerUser.id,
    });

    if (memberError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: memberError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update their profile with org id and staff details
    const profileUpdate: Record<string, unknown> = {
      organization_id,
      role: memberRole,
    };
    if (phone) profileUpdate.phone = phone;
    if (national_id) profileUpdate.national_id = national_id;
    if (date_of_birth) profileUpdate.date_of_birth = date_of_birth;
    if (gender) profileUpdate.gender = gender;
    if (county) profileUpdate.county = county;
    if (job_title) profileUpdate.job_title = job_title;
    if (department) profileUpdate.department = department;
    if (employment_type) profileUpdate.employment_type = employment_type;
    if (start_date) profileUpdate.start_date = start_date;
    if (staff_id) profileUpdate.staff_id = staff_id;
    if (notes) profileUpdate.notes = notes;

    await adminClient.from("profiles").update(profileUpdate).eq("user_id", newUser.user.id);

    // Assign RBAC role if provided
    if (rbac_role_id) {
      await adminClient.from("rbac_user_role_assignments").insert({
        user_id: newUser.user.id,
        organization_id,
        role_id: rbac_role_id,
        assigned_by: callerUser.id,
        is_active: true,
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
