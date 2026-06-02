import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SANDBOX_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_URL = "https://api.safaricom.co.ke";

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.startsWith("7") && digits.length === 9) return "254" + digits;
  if (digits.startsWith("254")) return digits;
  return digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const {
      campaign_id, organization_id, amount, currency = "KES",
      provider = "mpesa", donor_name, donor_email, donor_phone,
      message, is_anonymous = false,
    } = body || {};

    if (!campaign_id || !organization_id) return respond({ error: "campaign_id and organization_id required" });
    const amt = Number(amount);
    if (!amt || amt <= 0) return respond({ error: "Invalid amount" });
    if (!donor_name || String(donor_name).length > 200) return respond({ error: "Invalid donor name" });
    if (!["mpesa", "stripe", "paypal"].includes(provider)) return respond({ error: "Unsupported provider" });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate campaign is active and belongs to org
    const { data: campaign, error: ce } = await admin
      .from("donation_campaigns")
      .select("id, organization_id, status, beneficiary_id, program_id")
      .eq("id", campaign_id)
      .single();
    if (ce || !campaign) return respond({ error: "Campaign not found" });
    if (campaign.organization_id !== organization_id) return respond({ error: "Invalid organization" });
    if (campaign.status !== "active") return respond({ error: "Campaign is not active" });

    // Create pending donation
    const { data: donation, error: de } = await admin
      .from("donations")
      .insert({
        organization_id, campaign_id, amount: amt, currency, provider,
        donor_name: String(donor_name).slice(0, 200),
        donor_email: donor_email || null,
        donor_phone: donor_phone || null,
        message: message || null,
        is_anonymous: !!is_anonymous,
        status: "pending",
      })
      .select()
      .single();
    if (de) return respond({ error: de.message });

    // Stripe / PayPal stubs — return a placeholder message
    if (provider === "stripe" || provider === "paypal") {
      return respond({
        success: true,
        donation_id: donation.id,
        message: `${provider === "stripe" ? "Stripe" : "PayPal"} integration is not yet enabled. Your pledge was recorded and the organization will follow up.`,
      });
    }

    // M-Pesa STK Push
    if (!donor_phone) return respond({ error: "Phone required for M-Pesa" });
    const phone = normalizePhone(donor_phone);

    const env = Deno.env.get("MPESA_ENV") || "sandbox";
    const baseUrl = env === "production" ? PRODUCTION_URL : SANDBOX_URL;
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_PAYBILL_SHORTCODE") || Deno.env.get("MPESA_B2C_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      return respond({
        success: true,
        donation_id: donation.id,
        message: "Your pledge was recorded. The organization will reach out with M-Pesa payment instructions.",
      });
    }

    // Get token
    const authStr = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${authStr}` },
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return respond({ success: true, donation_id: donation.id, message: "Pledge recorded — M-Pesa auth failed; org will follow up." });
    }

    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/donation-callback`;

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amt),
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: `DON-${donation.id.slice(0, 8)}`,
        TransactionDesc: "Donation",
      }),
    });
    const stkData = await stkRes.json();

    await admin.from("donations").update({
      provider_reference: stkData.CheckoutRequestID || stkData.MerchantRequestID || null,
      metadata: { stk_response: stkData },
    }).eq("id", donation.id);

    if (stkData.ResponseCode === "0") {
      return respond({ success: true, donation_id: donation.id, message: "Check your phone and enter your M-Pesa PIN to complete the donation." });
    }
    return respond({ success: true, donation_id: donation.id, message: stkData.errorMessage || stkData.ResponseDescription || "STK push failed; the organization will follow up." });
  } catch (e) {
    console.error("donation-init error", e);
    return respond({ error: (e as Error).message });
  }
});