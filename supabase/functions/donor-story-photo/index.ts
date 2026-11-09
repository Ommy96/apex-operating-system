// Issues a 60-second signed URL for an impact-story photo AFTER confirming,
// with the caller's own session (RLS), that they may read that published story.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toPath(ref: string): string | null {
  const marker = "/impact-stories/";
  const i = ref.indexOf(marker);
  if (i !== -1) return decodeURIComponent(ref.slice(i + marker.length).split("?")[0]);
  if (/^https?:\/\//i.test(ref)) return null;
  return ref.replace(/^\/+/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" });
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: authErr } = await userClient.auth.getUser();
    if (authErr || !u.user) return json({ error: "Unauthorized" });

    const body = await req.json().catch(() => ({}));
    const storyId = String(body.story_id ?? "");
    const index = Number.isInteger(body.index) ? Number(body.index) : 0;
    if (!UUID.test(storyId) || index < 0 || index > 20) return json({ error: "Invalid request" });

    // Authorisation: the caller's own RLS must allow reading this published story.
    const { data: story, error: storyErr } = await userClient
      .from("impact_stories")
      .select("id, org_id, status, photo_urls, deleted_at")
      .eq("id", storyId)
      .maybeSingle();
    if (storyErr) return json({ error: storyErr.message });
    if (!story || story.deleted_at || String(story.status).toLowerCase() !== "published") return json({ error: "Story not available" });

    const ref = (story.photo_urls || [])[index];
    if (!ref) return json({ error: "No photo" });
    const path = toPath(String(ref));
    if (!path || !path.startsWith(`${story.org_id}/`)) return json({ error: "Photo not available" });

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: signed, error: signErr } = await admin.storage.from("impact-stories").createSignedUrl(path, 60);
    if (signErr || !signed?.signedUrl) return json({ error: signErr?.message || "Could not sign photo" });
    return json({ url: signed.signedUrl, expires_in: 60 });
  } catch (e) {
    return json({ error: (e as Error).message });
  }
});
