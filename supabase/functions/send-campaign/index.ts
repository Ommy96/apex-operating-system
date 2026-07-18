import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CampaignRequest {
  campaign_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const atApiKey = Deno.env.get("AT_API_KEY");
    const atUsername = Deno.env.get("AT_USERNAME");
    const waToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const waPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { campaign_id }: CampaignRequest = await req.json();

    // Get campaign
    const { data: campaign, error: campError } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (campError || !campaign) throw new Error("Campaign not found");

    // Update status to sending
    await supabaseAdmin.from("campaigns").update({ status: "sending" }).eq("id", campaign_id);

    // Get recipients
    const { data: recipients, error: recipError } = await supabaseAdmin
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending");
    if (recipError) throw new Error("Failed to fetch recipients");

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients || []) {
      try {
        if (recipient.channel === "email" && recipient.recipient_email) {
          if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: "Ufanisi <noreply@ufanisi.inferatechs.com>",
            to: [recipient.recipient_email],
            subject: campaign.subject || campaign.name,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">${campaign.subject || campaign.name}</h2>
                <div style="color: #666; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${campaign.body}</div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="color: #999; font-size: 12px; text-align: center;">Sent via Ufanisi Platform</p>
              </div>
            `,
          });
          await supabaseAdmin.from("campaign_recipients")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);
          sentCount++;
        } else if (recipient.channel === "sms" && recipient.recipient_phone) {
          if (!atApiKey || !atUsername) throw new Error("Africa's Talking credentials not configured");
          const atResponse = await fetch("https://api.africastalking.com/version1/messaging", {
            method: "POST",
            headers: {
              "apiKey": atApiKey,
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json",
            },
            body: new URLSearchParams({
              username: atUsername,
              to: recipient.recipient_phone,
              message: campaign.body,
            }),
          });
          const atResult = await atResponse.json();
          if (!atResponse.ok) throw new Error(`AT SMS failed: ${JSON.stringify(atResult)}`);
          await supabaseAdmin.from("campaign_recipients")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);
          sentCount++;
        } else if (recipient.channel === "whatsapp" && recipient.recipient_phone) {
          if (!waToken || !waPhoneId) throw new Error("WhatsApp not configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)");
          const to = recipient.recipient_phone.replace(/[^\d]/g, "");
          const usingTemplate = !!(campaign as any).whatsapp_template_name;
          const payload: Record<string, unknown> = { messaging_product: "whatsapp", to };
          if (usingTemplate) {
            payload.type = "template";
            payload.template = {
              name: (campaign as any).whatsapp_template_name,
              language: { code: (campaign as any).whatsapp_template_language || "en_US" },
            };
          } else {
            payload.type = "text";
            payload.text = { preview_url: false, body: campaign.body };
          }
          const waRes = await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const waJson = await waRes.json().catch(() => ({}));
          if (!waRes.ok) throw new Error(waJson?.error?.message || `WhatsApp API error ${waRes.status}`);
          await supabaseAdmin.from("campaign_recipients")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);
          sentCount++;
        }
      } catch (err: any) {
        console.error(`Failed to send to ${recipient.recipient_name}:`, err.message);
        await supabaseAdmin.from("campaign_recipients")
          .update({ status: "failed", error_message: err.message })
          .eq("id", recipient.id);
        failedCount++;
      }
    }

    // Update campaign
    await supabaseAdmin.from("campaigns").update({
      status: failedCount === (recipients?.length || 0) ? "failed" : "sent",
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
      delivered_count: sentCount,
    }).eq("id", campaign_id);

    // Log message for each sent recipient
    for (const r of (recipients || []).filter(r => r.status !== "failed")) {
      await supabaseAdmin.from("stakeholder_messages").insert({
        organization_id: campaign.organization_id,
        sender_id: user.id,
        channel: r.channel,
        recipient_type: "other",
        recipient_name: r.recipient_name,
        recipient_contact: r.recipient_email || r.recipient_phone,
        subject: campaign.subject || campaign.name,
        body: campaign.body,
        direction: "outbound",
        status: "sent",
      });
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
