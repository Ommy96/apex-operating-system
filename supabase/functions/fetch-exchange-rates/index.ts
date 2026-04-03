import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "SEK", "NOK", "DKK"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch rates with KES as base
    const res = await fetch("https://open.er-api.com/v6/latest/KES");
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();

    if (data.result !== "success") throw new Error("Exchange rate API failed");

    const rates: { base_currency: string; target_currency: string; rate: number }[] = [];

    for (const cur of CURRENCIES) {
      const rateFromKes = data.rates[cur];
      if (rateFromKes) {
        // KES -> target
        rates.push({ base_currency: "KES", target_currency: cur, rate: rateFromKes });
        // target -> KES (inverse)
        rates.push({ base_currency: cur, target_currency: "KES", rate: 1 / rateFromKes });
      }
    }

    // Cross rates between non-KES currencies
    for (let i = 0; i < CURRENCIES.length; i++) {
      for (let j = i + 1; j < CURRENCIES.length; j++) {
        const a = CURRENCIES[i];
        const b = CURRENCIES[j];
        if (data.rates[a] && data.rates[b]) {
          rates.push({ base_currency: a, target_currency: b, rate: data.rates[b] / data.rates[a] });
          rates.push({ base_currency: b, target_currency: a, rate: data.rates[a] / data.rates[b] });
        }
      }
    }

    // Upsert all rates
    for (const r of rates) {
      const { error } = await supabase
        .from("currency_rates")
        .upsert(
          { base_currency: r.base_currency, target_currency: r.target_currency, rate: r.rate, fetched_at: new Date().toISOString() },
          { onConflict: "base_currency,target_currency" }
        );
      if (error) console.error("Upsert error:", error);
    }

    return new Response(
      JSON.stringify({ success: true, rates_updated: rates.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error fetching exchange rates:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
