import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { Resend } from "npm:resend@2.0.0";

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
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

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

    const { recipient_emails, subject, body, organization_id } = await req.json();

    if (!recipient_emails?.length || !subject || !body || !organization_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipient_emails, subject, body, organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to verify sender belongs to org and is admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: membership } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("user_id", senderId)
      .eq("organization_id", organization_id)
      .single();

    if (!membership || !["admin", "management"].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Only admins can send emails to members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender profile
    const { data: senderProfile } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", senderId)
      .single();

    // Get org name
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    const orgName = org?.name || "Your Organization";
    const senderName = senderProfile?.full_name || "Admin";

    const resend = new Resend(resendKey);

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    // Send emails one by one (Resend free tier limit)
    for (const email of recipient_emails) {
      try {
        const { error: sendError } = await resend.emails.send({
          from: `${orgName} <onboarding@resend.dev>`,
          to: [email],
          subject: subject,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
                <h2 style="color: #1a1a2e; margin: 0 0 4px 0; font-size: 18px;">${orgName}</h2>
                <p style="color: #6b7280; margin: 0; font-size: 13px;">Message from ${senderName}</p>
              </div>
              <h3 style="color: #1a1a2e; font-size: 16px; margin-bottom: 12px;">${subject}</h3>
              <div style="color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${body}</div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                This email was sent via ${orgName}'s communication system. 
                Please do not reply directly to this email.
              </p>
            </div>
          `,
        });

        if (sendError) {
          results.failed++;
          results.errors.push(`${email}: ${sendError.message}`);
        } else {
          results.sent++;
        }
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${email}: ${e.message}`);
      }
    }

    // Log the communication in stakeholder_messages
    await adminClient.from("stakeholder_messages").insert({
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
