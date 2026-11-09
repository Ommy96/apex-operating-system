import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const stk = payload?.Body?.stkCallback;
    if (!stk) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

    const reference = stk.CheckoutRequestID;
    const resultCode = stk.ResultCode;
    const resultDesc = stk.ResultDesc;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: donation, error: donationError } = await admin
      .from("donations")
      .select("id, organization_id, campaign_id, donor_name, amount, donor_phone, metadata")
      .eq("provider_reference", reference)
      .maybeSingle();
    if (donationError) throw new Error(`Database read failed: ${donationError.message}`);
    if (!donation) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

    if (resultCode === 0) {
      const items = stk.CallbackMetadata?.Item || [];
      const receipt = items.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value;

      {
        const { error: writeError } = await admin.from("donations").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        provider_reference: receipt || reference,
        metadata: { ...(donation.metadata || {}), callback: stk },
      }).eq("id", donation.id);
        if (writeError) throw new Error(`update donations failed: ${writeError.message}`);
      }

      // If campaign is beneficiary-scoped, also record in beneficiary_donors for legacy reporting
      if (donation.campaign_id) {
        const { data: campaign, error: campaignError } = await admin
          .from("donation_campaigns")
          .select("beneficiary_id, program_id")
          .eq("id", donation.campaign_id)
          .single();
        if (campaignError) throw new Error(`Database read failed: ${campaignError.message}`);
        if (campaign?.beneficiary_id) {
          {
            const { error: writeError } = await admin.from("beneficiary_donors").insert({
            organization_id: donation.organization_id,
            beneficiary_id: campaign.beneficiary_id,
            program_id: campaign.program_id,
            donor_name: donation.donor_name,
            amount_received: donation.amount,
            donation_date: new Date().toISOString(),
            notes: `Public donation via M-Pesa (${receipt || reference})`,
          });
            if (writeError) throw new Error(`insert beneficiary_donors failed: ${writeError.message}`);
          }
        }
      }
    } else {
      {
        const { error: writeError } = await admin.from("donations").update({
        status: "failed",
        metadata: { ...(donation.metadata || {}), callback: stk, failure_reason: resultDesc },
      }).eq("id", donation.id);
        if (writeError) throw new Error(`update donations failed: ${writeError.message}`);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (e) {
    console.error("donation-callback error", e);
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }
});