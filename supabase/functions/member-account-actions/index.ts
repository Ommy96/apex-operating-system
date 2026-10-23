import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Admin-only account recovery for organisation members.
 *  - status:               email-confirmation state for every member of the org
 *  - resend_confirmation:  re-send the sign-up confirmation email
 *  - confirm_email:        mark the member's email as confirmed (admin vouches for it)
 * Handled errors return HTTP 200 with { error } so the UI can toast the message.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in again." });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: "Please sign in again." });

    const { action, organization_id, user_id, redirect_to } = await req.json();
    if (!action || !organization_id) return json({ error: "Missing action or organisation." });

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Caller must be owner/admin of THIS organisation, or a platform super admin.
    const { data: callerMember, error: cmErr } = await admin
      .from("organization_members")
      .select("role")
      .eq("user_id", caller.id)
      .eq("organization_id", organization_id)
      .maybeSingle();
    if (cmErr) return json({ error: cmErr.message });
    const { data: isSuper, error: superErr } = await admin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (superErr) return json({ error: superErr.message });
    const callerRole = (callerMember?.role || "").toLowerCase();
    if (!["owner", "admin"].includes(callerRole) && !isSuper) {
      return json({ error: "Only organisation admins can manage member accounts." });
    }

    const { data: members, error: mErr } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organization_id);
    if (mErr) return json({ error: mErr.message });
    const memberIds = new Set((members || []).map((m) => m.user_id));

    if (action === "status") {
      const result: Record<string, { email_confirmed_at: string | null; last_sign_in_at: string | null }> = {};
      for (const id of memberIds) {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (error || !data?.user) continue;
        result[id] = {
          email_confirmed_at: data.user.email_confirmed_at ?? null,
          last_sign_in_at: data.user.last_sign_in_at ?? null,
        };
      }
      return json({ success: true, members: result });
    }

    if (!user_id || !memberIds.has(user_id)) {
      return json({ error: "That person is not a member of this organisation." });
    }
    const { data: target, error: tErr } = await admin.auth.admin.getUserById(user_id);
    if (tErr || !target?.user?.email) return json({ error: tErr?.message || "Account not found." });

    if (action === "resend_confirmation") {
      if (target.user.email_confirmed_at) {
        return json({ error: "This email is already confirmed — they can sign in. If they forgot the password, use 'Forgot password'." });
      }
      const { error } = await admin.auth.resend({
        type: "signup",
        email: target.user.email,
        options: redirect_to ? { emailRedirectTo: redirect_to } : undefined,
      });
      if (error) return json({ error: error.message });
      return json({ success: true, message: `Confirmation email sent to ${target.user.email}.` });
    }

    if (action === "confirm_email") {
      const { error } = await admin.auth.admin.updateUserById(user_id, { email_confirm: true });
      if (error) return json({ error: error.message });
      await admin.from("audit_logs").insert({
        user_id: caller.id,
        organization_id,
        action: "member_email_confirmed_by_admin",
        table_name: "auth.users",
        record_id: user_id,
      });
      return json({ success: true, message: `${target.user.email} can now sign in.` });
    }

    return json({ error: `Unknown action: ${action}` });
  } catch (err) {
    return json({ error: (err as Error).message });
  }
});
