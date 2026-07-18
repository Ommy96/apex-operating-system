import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  to: string; // E.164 phone number, e.g. 2547XXXXXXXX
  recipient_name?: string;
  recipient_type?: "donor" | "guardian" | "beneficiary" | "staff" | "other";
  // Either free-form text ...
  message?: string;
  // ... or an approved template
  template_name?: string;
  template_language?: string; // default en_US
  template_components?: unknown[];
  organization_id?: string;
  campaign_id?: string;
}

function normalizePhone(p: string): string {
  return (p || "").replace(/[^\d]/g, "");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if (!token || !phoneId) {
      return json({ error: "WhatsApp not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID." }, 200);
    }

    const body = (await req.json()) as WhatsAppRequest;
    const to = normalizePhone(body.to);
    if (!to) return json({ error: "Missing recipient phone (to)" }, 400);
    if (!body.message && !body.template_name) {
      return json({ error: "Provide either message or template_name" }, 400);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve organization / sender (best-effort)
    let orgId = body.organization_id || null;
    let senderId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await anon.auth.getUser();
      senderId = data.user?.id ?? null;
      if (!orgId && senderId) {
        const { data: mem } = await admin
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", senderId)
          .eq("is_primary", true)
          .maybeSingle();
        orgId = mem?.organization_id ?? null;
      }
    }

    // Build payload for WhatsApp Business Cloud API
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
    };
    if (body.template_name) {
      payload.type = "template";
      payload.template = {
        name: body.template_name,
        language: { code: body.template_language || "en_US" },
        ...(body.template_components ? { components: body.template_components } : {}),
      };
    } else {
      payload.type = "text";
      payload.text = { preview_url: false, body: body.message };
    }

    const waRes = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const waJson = await waRes.json().catch(() => ({}));

    const ok = waRes.ok;
    const errMsg = ok ? null : (waJson?.error?.message || `WhatsApp API error ${waRes.status}`);

    // Log to stakeholder_messages
    if (orgId) {
      await admin.from("stakeholder_messages").insert({
        organization_id: orgId,
        sender_id: senderId,
        channel: "whatsapp",
        recipient_type: body.recipient_type || "other",
        recipient_name: body.recipient_name || to,
        recipient_contact: to,
        subject: body.template_name || null,
        body: body.message || `[template: ${body.template_name}]`,
        direction: "outbound",
        status: ok ? "sent" : "failed",
      });
    }

    if (!ok) return json({ error: errMsg, details: waJson }, 200);
    return json({ success: true, whatsapp: waJson });
  } catch (e) {
    return json({ error: (e as Error).message }, 200);
  }
});