import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isSent, retryDelivery } from "../_shared/delivery.ts";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: authErr } = await userClient.auth.getUser();
    if (authErr || !u.user) return json({ success: false, error: "Unauthorized" });
    const { delivery_id } = await req.json().catch(() => ({}));
    if (typeof delivery_id !== "string" || !/^[0-9a-f-]{36}$/i.test(delivery_id)) return json({ success: false, error: "delivery_id required" });

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: d, error: dErr } = await admin.from("message_deliveries").select("organization_id").eq("id", delivery_id).maybeSingle();
    if (dErr) return json({ success: false, error: dErr.message });
    if (!d) return json({ success: false, error: "Delivery not found" });
    const { data: mem, error: memErr } = await admin.from("organization_members").select("role")
      .eq("user_id", u.user.id).eq("organization_id", d.organization_id).maybeSingle();
    if (memErr) return json({ success: false, error: memErr.message });
    if (!mem || !["admin", "management"].includes(String(mem.role).toLowerCase())) return json({ success: false, error: "Only organisation admins can retry deliveries" });

    const r = await retryDelivery(admin, delivery_id);
    return json({ success: isSent(r.status), status: r.status, duplicate: !!r.duplicate, error: r.error ?? null });
  } catch (e) {
    return json({ success: false, error: (e as Error).message });
  }
});
