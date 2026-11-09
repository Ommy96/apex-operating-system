import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { deliver, isSent } from "../_shared/delivery.ts";

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
    const { data: mem, error: memErr } = await supabaseAdmin.from("organization_members").select("role")
      .eq("user_id", user.id).eq("organization_id", campaign.organization_id).maybeSingle();
    if (memErr) throw new Error(memErr.message);
    if (!mem || !["admin", "management"].includes(String(mem.role).toLowerCase())) {
      return new Response(JSON.stringify({ error: "Only organisation admins can send campaigns" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Update status to sending
    await supabaseAdmin.from("campaigns").update({ status: "sending" }).eq("id", campaign_id);

    // Get recipients
    const { data: recipients, error: recipError } = await supabaseAdmin
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", campaign_id)
      .in("status", ["pending", "failed"]);
    if (recipError) throw new Error("Failed to fetch recipients");

    let sentCount = 0;
    let failedCount = 0;
    const esc = (v: string) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]);

    for (const recipient of recipients || []) {
      const channel = String(recipient.channel).toLowerCase() as "email" | "sms" | "whatsapp";
      const to = channel === "email" ? recipient.recipient_email : recipient.recipient_phone;
      if (!to || !["email", "sms", "whatsapp"].includes(channel)) {
        await supabaseAdmin.from("campaign_recipients").update({ status: "failed", error_message: "Missing contact for channel" }).eq("id", recipient.id);
        failedCount++; continue;
      }
      const templateName = channel === "whatsapp" ? (campaign.subject || "").trim() : "";
      const r = await deliver(supabaseAdmin, {
        organizationId: campaign.organization_id, channel, source: "send-campaign",
        idempotencyKey: `campaign:${campaign_id}:${recipient.id}`, to,
        subject: campaign.subject || campaign.name,
        text: campaign.body,
        html: channel === "email" ? `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2>${esc(campaign.subject || campaign.name)}</h2><div style="font-size:16px;line-height:1.6;white-space:pre-wrap;">${esc(campaign.body)}</div><hr style="border:none;border-top:1px solid #eee;margin:30px 0;"/><p style="color:#999;font-size:12px;text-align:center;">Sent via ApexOS</p></div>` : undefined,
        whatsappTemplate: templateName ? { name: templateName } : undefined,
        createdBy: user.id,
      });
      const ok = isSent(r.status);
      const { error: recErr } = await supabaseAdmin.from("campaign_recipients").update({
        status: ok ? "sent" : "failed", error_message: ok ? null : r.error,
        sent_at: ok ? new Date().toISOString() : null, metadata: { ...(recipient.metadata || {}), delivery_id: r.deliveryId, delivery_status: r.status },
      }).eq("id", recipient.id);
      if (recErr) console.error("recipient status update failed", recErr.message);
      if (ok) sentCount++; else failedCount++;
    }

    // Update campaign
    await supabaseAdmin.from("campaigns").update({
      status: failedCount === (recipients?.length || 0) ? "failed" : "sent",
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
      delivered_count: sentCount,
    }).eq("id", campaign_id);

    // Per-recipient delivery is recorded in message_deliveries (status, attempts, errors).

    return new Response(
      JSON.stringify({ success: failedCount === 0, sent: sentCount, failed: failedCount }),
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
