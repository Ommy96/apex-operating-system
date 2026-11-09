import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { deliver, isSent, isSkipped } from "../_shared/delivery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderId = claimsData.claims.sub;

    const { recipient_emails, subject, body, organization_id, idempotency_key } = await req.json();
    const batchKey = idempotency_key || crypto.randomUUID();

    if (!recipient_emails?.length || !subject || !body || !organization_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipient_emails, subject, body, organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to verify sender belongs to org and is admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: membership, error: membershipError } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("user_id", senderId)
      .eq("organization_id", organization_id)
      .single();
    if (membershipError) throw new Error(`Database read failed: ${membershipError.message}`);

    if (!membership || !["admin", "management"].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Only admins can send emails to members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender profile
    const { data: senderProfile, error: senderProfileError } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", senderId)
      .single();
    if (senderProfileError) throw new Error(`Database read failed: ${senderProfileError.message}`);

    // Get org name
    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();
    if (orgError) throw new Error(`Database read failed: ${orgError.message}`);

    const orgName = org?.name || "Your Organization";
    const senderName = senderProfile?.full_name || "Admin";

    const results = { sent: 0, failed: 0, skipped: 0, duplicates: 0, errors: [] as string[] };
    const esc = (v: string) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]);

    for (const email of recipient_emails) {
      const html = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="margin:0 0 4px 0;font-size:18px;">${esc(orgName)}</h2>
          <p style="color:#6b7280;margin:0 0 16px 0;font-size:13px;">Message from ${esc(senderName)}</p>
          <h3 style="font-size:16px;">${esc(subject)}</h3>
          <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(body)}</div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:11px;margin:0;">Sent via ${esc(orgName)}'s communication system. Please do not reply.</p></div>`;
      const { data: rp, error: rpErr } = await adminClient.from("profiles").select("user_id").eq("email", email).maybeSingle();
      if (rpErr) { results.failed++; results.errors.push(`${email}: ${rpErr.message}`); continue; }
      const r = await deliver(adminClient, {
        organizationId: organization_id, channel: "email", source: "send-member-email",
        idempotencyKey: `member-email:${organization_id}:${batchKey}:${String(email).toLowerCase()}`,
        to: email, recipientUserId: rp?.user_id ?? null, subject, html, fromName: orgName, createdBy: senderId,
      });
      if (r.duplicate) results.duplicates++;
      else if (isSent(r.status)) results.sent++;
      else if (isSkipped(r.status)) { results.skipped++; results.errors.push(`${email}: ${r.error}`); }
      else { results.failed++; results.errors.push(`${email}: ${r.error}`); }
    }

    // Log the communication in stakeholder_messages
    {
      const { error: writeError } = await adminClient.from("stakeholder_messages").insert({
      organization_id,
      sender_id: senderId,
      channel: "email",
      direction: "outbound",
      recipient_type: "staff",
      recipient_name: `${results.sent} organization member(s)`,
      recipient_contact: recipient_emails.join(", "),
      subject,
      body,
    });
      if (writeError) throw new Error(`insert stakeholder_messages failed: ${writeError.message}`);
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-member-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
