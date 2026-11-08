// Donor-facing impact feed: chronological anonymized posts with attribution.
// Returns HTTP 200 even on handled errors (UI-toast contract).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type Post = {
  id: string;
  kind: "field_log" | "activity_completed" | "disbursement" | "allocation_summary";
  occurred_at: string;
  title: string;
  body: string;
  photo_url: string | null;
  project_id: string | null;
  project_name: string | null;
  attribution_base: number;
  attribution_currency: string;
  beneficiary_label: string | null;
  meta: any;
};

function ageBracket(dob?: string | null) {
  if (!dob) return "a participant";
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400_000));
  if (years < 5) return "a child under 5";
  if (years < 12) return "a child";
  if (years < 18) return "a young person";
  return "an adult participant";
}

function anonymize(b: any, grade?: string | null) {
  if (!b) return "a participant";
  if (grade) return `a student in ${grade}`;
  if (b.grade) return `a student in ${b.grade}`;
  if (b.academic_level) return `a learner at ${b.academic_level} level`;
  return ageBracket(b.date_of_birth);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const body = (req.method === "POST" ? await req.json().catch(() => ({})) : {}) as {
      donor_account_id?: string;
      limit?: number;
      before?: string; // ISO timestamp for cursor
    };
    const limit = Math.min(50, Math.max(5, body.limit ?? 20));

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) throw new Error("Unauthorized");
    const { data: account, error: accountError } = await supabase.from("donor_accounts")
      .select("id, organization_id, donor_name").eq("user_id", authData.user.id).eq("is_active", true).maybeSingle();
    if (accountError) throw accountError;
    if (!account || (body.donor_account_id && body.donor_account_id !== account.id)) throw new Error("Forbidden");
    const donorAccountId = account.id;
    const { data: updates, error: updatesError } = await supabase.from('sponsorship_updates')
      .select('id,title,content,created_at,beneficiary_id,donor_name,contribution_id')
      .eq('organization_id', account.organization_id).eq('visible_to_donor', true)
      .not('approved_at','is',null).is('deleted_at',null).order('created_at',{ascending:false});
    if (updatesError) throw updatesError;
    const { data: links, error: linksError } = await supabase.from('beneficiary_donors')
      .select('beneficiary_id,amount_received').eq('organization_id',account.organization_id).eq('donor_name',account.donor_name);
    if (linksError) throw linksError;
    const ids = new Set((links || []).map((r: any) => r.beneficiary_id));
    const posts = (updates || []).filter((u: any) => ids.has(u.beneficiary_id) && (!u.donor_name || u.donor_name === account.donor_name) && !u.contribution_id)
      .map((u: any) => ({id:u.id,kind:'approved_update',occurred_at:u.created_at,title:u.title,body:u.content,photo_url:null,attribution_base:0,attribution_currency:'KES'}));
    return new Response(JSON.stringify({ok:true,posts,totals:{recorded:(links||[]).reduce((sum:number,r:any)=>sum+Number(r.amount_received||0),0),currency:'KES'},next_cursor:null}),{status:200,headers:{...corsHeaders,'Content-Type':'application/json'}});
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: String(e?.message ?? e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});