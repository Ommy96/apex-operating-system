import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";
import { invitationEmail } from "../_shared/invitation-email.ts";

const FROM = "ApexOS <noreply@apex.inferatechs.com>";
const REPLY_TO = "support@apex.inferatechs.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" });

    const admin = createClient(supabaseUrl, serviceKey);
    const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await caller.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" });

    const body = await req.json().catch(() => ({}));
    const { email, role, organization_id, organization_name, invitation_id } = body as Record<string, string>;

    if (!email || !organization_id) return json({ error: "email and organization_id are required" });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: `"${email}" is not a valid email address` });

    // Caller must belong to the organization (org-scoped)
    const { data: membership } = await admin
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .maybeSingle();

    const { data: isSuperAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!membership && !isSuperAdmin) return json({ error: "You do not have access to this organization" });

    if (!resendKey) {
      return json({ error: "Email is not configured (RESEND_API_KEY missing). Contact your administrator." });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Create/refresh the invitation record, marked as sending until we know the outcome
    let invitation: any;
    if (invitation_id) {
      const { data, error } = await admin
        .from("organization_invitations")
        .update({ status: "pending", delivery_status: "sending", expires_at: expiresAt })
        .eq("id", invitation_id)
        .eq("organization_id", organization_id)
        .select()
        .single();
      if (error) return json({ error: `Could not update invitation: ${error.message}` });
      invitation = data;
    } else {
      const { data, error } = await admin
        .from("organization_invitations")
        .upsert({
          organization_id,
          email: email.trim().toLowerCase(),
          role: role || "member",
          invited_by: user.id,
          status: "pending",
          delivery_status: "sending",
          delivery_error: null,
          expires_at: expiresAt,
        }, { onConflict: "organization_id,email" })
        .select()
        .single();
      if (error) return json({ error: `Could not create invitation: ${error.message}` });
      invitation = data;
    }

    // Inviter + org display info
    const { data: profile } = await admin
      .from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle();
    const { data: org } = await admin
      .from("organizations").select("name").eq("id", organization_id).maybeSingle();

    const inviterName = profile?.full_name || profile?.email || "A colleague";
    const orgName = org?.name || organization_name || "your organization";

    const appUrl = req.headers.get("origin") || "https://apexos-dms.lovable.app";
    const inviteUrl = `${appUrl}/auth?invite=${invitation.token}`;

    const { html, text, subject } = invitationEmail({
      inviterName,
      orgName,
      role: invitation.role,
      inviteUrl,
      expiresAt,
    });

    const resend = new Resend(resendKey);
    const { data: sent, error: sendError } = await resend.emails.send({
      from: FROM,
      to: [invitation.email],
      reply_to: REPLY_TO,
      subject,
      html,
      text,
    });

    if (sendError) {
      const reason = (sendError as any)?.message || "Unknown email provider error";
      console.error("send-invitation resend error:", JSON.stringify(sendError));
      await admin.from("organization_invitations").update({
        delivery_status: "failed",
        delivery_error: reason,
        send_attempts: (invitation.send_attempts ?? 0) + 1,
      }).eq("id", invitation.id);
      return json({ error: `Email could not be delivered: ${reason}`, invitation_id: invitation.id });
    }

    await admin.from("organization_invitations").update({
      delivery_status: "sent",
      delivery_error: null,
      last_sent_at: new Date().toISOString(),
      send_attempts: (invitation.send_attempts ?? 0) + 1,
    }).eq("id", invitation.id);

    console.log("Invitation email sent", { to: invitation.email, id: (sent as any)?.id });

    return json({ success: true, invitation_id: invitation.id, invite_url: inviteUrl });
  } catch (error: any) {
    console.error("send-invitation fatal:", error?.message, error);
    return json({ error: error?.message || "Unexpected error sending invitation" });
  }
});
