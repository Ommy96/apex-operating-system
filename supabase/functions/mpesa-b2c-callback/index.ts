import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const result = body?.Result;

    if (!result) {
      return new Response(JSON.stringify({ error: "Invalid callback payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const conversationId = result.ConversationID;
    const resultCode = String(result.ResultCode);
    const resultDesc = result.ResultDesc || "";
    const transactionId = result.TransactionID || "";

    // Find the matching transfer
    const { data: transfers, error: transfersError } = await supabase
      .from("cash_transfers")
      .select("id, org_id")
      .or(`mpesa_transaction_id.eq.${conversationId},mpesa_transaction_id.eq.${result.OriginatorConversationID}`)
      .eq("status", "processing")
      .limit(1);
    if (transfersError) throw new Error(`Database read failed: ${transfersError.message}`);

    const transfer = transfers?.[0];
    if (!transfer) {
      console.error("No matching transfer found for conversation:", conversationId);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const isSuccess = resultCode === "0";

    {
      const { error: writeError } = await supabase.from("cash_transfers").update({
      status: isSuccess ? "completed" : "failed",
      mpesa_result_code: resultCode,
      mpesa_result_desc: resultDesc,
      mpesa_transaction_id: transactionId || conversationId,
      completed_at: isSuccess ? new Date().toISOString() : null,
      failure_reason: isSuccess ? null : resultDesc,
    }).eq("id", transfer.id);
      if (writeError) throw new Error(`update cash_transfers failed: ${writeError.message}`);
    }

    // Audit log
    {
      const { error: writeError } = await supabase.from("audit_logs").insert({
      event_type: isSuccess ? "mpesa_transfer_completed" : "mpesa_transfer_failed",
      entity_type: "cash_transfers",
      entity_id: transfer.id,
      metadata: { resultCode, resultDesc, transactionId, conversationId },
    });
      if (writeError) throw new Error(`insert audit_logs failed: ${writeError.message}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("M-Pesa callback error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
