import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SANDBOX_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_URL = "https://api.safaricom.co.ke";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { transferId } = await req.json();
    if (!transferId) {
      return new Response(JSON.stringify({ error: "transferId required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch transfer record
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: transfer, error: fetchErr } = await adminClient
      .from("cash_transfers")
      .select("*")
      .eq("id", transferId)
      .single();

    if (fetchErr || !transfer) {
      return new Response(JSON.stringify({ error: "Transfer not found" }), { status: 404, headers: corsHeaders });
    }

    const env = Deno.env.get("MPESA_ENV") || "sandbox";
    const baseUrl = env === "production" ? PRODUCTION_URL : SANDBOX_URL;
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_B2C_SHORTCODE");
    const initiatorName = Deno.env.get("MPESA_B2C_INITIATOR_NAME");
    const securityCredential = Deno.env.get("MPESA_B2C_SECURITY_CREDENTIAL");
    const resultUrl = Deno.env.get("MPESA_B2C_RESULT_URL");
    const queueTimeoutUrl = Deno.env.get("MPESA_B2C_QUEUE_TIMEOUT_URL");

    if (!consumerKey || !consumerSecret || !shortcode) {
      return new Response(JSON.stringify({ error: "M-Pesa credentials not configured" }), { status: 500, headers: corsHeaders });
    }

    // Step 1: Get OAuth token
    const authStr = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${authStr}` },
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("Failed to get M-Pesa OAuth token");

    // Step 2: B2C payment
    const b2cPayload = {
      InitiatorName: initiatorName,
      SecurityCredential: securityCredential,
      CommandID: "BusinessPayment",
      Amount: Math.round(Number(transfer.amount_kes)),
      PartyA: shortcode,
      PartyB: transfer.phone_number,
      Remarks: transfer.purpose || "Cash transfer",
      QueueTimeOutURL: queueTimeoutUrl || `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-b2c-callback`,
      ResultURL: resultUrl || `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-b2c-callback`,
      Occassion: transfer.batch_name || "Transfer",
    };

    const b2cRes = await fetch(`${baseUrl}/mpesa/b2c/v3/paymentrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(b2cPayload),
    });

    const b2cData = await b2cRes.json();

    if (b2cData.ResponseCode === "0") {
      // Update transfer status
      await adminClient.from("cash_transfers").update({
        status: "processing",
        mpesa_transaction_id: b2cData.ConversationID || b2cData.OriginatorConversationID,
      }).eq("id", transferId);

      return new Response(
        JSON.stringify({ success: true, conversationId: b2cData.ConversationID }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      await adminClient.from("cash_transfers").update({
        status: "failed",
        failure_reason: b2cData.ResponseDescription || "Unknown error",
        mpesa_result_code: b2cData.ResponseCode,
        mpesa_result_desc: b2cData.ResponseDescription,
      }).eq("id", transferId);

      return new Response(
        JSON.stringify({ error: b2cData.ResponseDescription }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("M-Pesa B2C error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
