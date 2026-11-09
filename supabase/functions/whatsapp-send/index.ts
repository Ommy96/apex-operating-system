import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { deliver, isSent } from "../_shared/delivery.ts";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ success: false, error: "Unauthorized" });
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: authErr } = await userClient.auth.getUser();
    if (authErr || !u.user) return json({ success: false, error: "Unauthorized" });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const to = String(body.to || "").replace(/[^\d]/g, "");
    if (to.length < 8 || to.length > 15) return json({ success: false, error: "Recipient phone must be an international number, e.g. 2547XXXXXXXX" });
    if (!body.message && !body.template_name) return json({ success: false, error: "Provide a message or an approved template name" });
    if (body.message && String(body.message).length > 4000) return json({ success: false, error: "Message too long" });

    const orgId: string | null = body.organization_id || null;
    if (!orgId) return json({ success: false, error: "organization_id is required" });
    const { data: mem, error: memErr } = await admin.from("organization_members").select("id").eq("user_id", u.user.id).eq("organization_id", orgId).maybeSingle();
    if (memErr) return json({ success: false, error: memErr.message });
    if (!mem) return json({ success: false, error: "You are not a member of this organisation" });

    const idempotencyKey = `whatsapp:${orgId}:${body.idempotency_key || crypto.randomUUID()}:${to}`;
    const r = await deliver(admin, {
      organizationId: orgId, channel: "whatsapp", source: "whatsapp-send", idempotencyKey, to,
      recipientUserId: body.recipient_user_id ?? null,
      text: body.message ?? undefined,
      subject: body.template_name ?? null,
      whatsappTemplate: body.template_name ? { name: body.template_name, language: body.template_language, components: body.template_components } : undefined,
      createdBy: u.user.id,
    });

    const { error: logErr } = await admin.from("stakeholder_messages").insert({
      organization_id: orgId, sender_id: u.user.id, channel: "whatsapp",
      recipient_type: body.recipient_type || "other", recipient_name: body.recipient_name || to, recipient_contact: to,
      subject: body.template_name || null, body: body.message || `[template: ${body.template_name}]`,
      direction: "outbound", status: isSent(r.status) ? "sent" : "failed", metadata: { delivery_id: r.deliveryId, delivery_status: r.status },
    });
    if (logErr) console.error("stakeholder log failed", logErr.message);

    return json({ success: isSent(r.status), status: r.status, duplicate: !!r.duplicate, error: isSent(r.status) ? null : r.error, delivery_id: r.deliveryId });
  } catch (e) {
    return json({ success: false, error: (e as Error).message });
  }
});
