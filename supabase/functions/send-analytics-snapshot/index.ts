import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TAB_LABELS: Record<string, string> = {
  overview: "Overview",
  beneficiary: "Beneficiary Intelligence",
  programme: "Programme & Project",
  funding: "Funding Intelligence",
  visitation: "Visitations",
  risk: "Risk Dashboard",
  demographics: "Demographics",
  forecast: "Forecasting",
  quality: "Data Quality",
};

function nextSendDate(frequency: string): string {
  const d = new Date();
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setMonth(d.getMonth() + 3);
  return d.toISOString();
}

function buildEmailHtml(opts: {
  orgName: string;
  reportName: string;
  tabLabel: string;
  frequency: string;
  appUrl: string;
  metrics: { label: string; value: string }[];
}) {
  const metricRows = opts.metrics
    .map(
      (m) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${m.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:600;text-align:right;">${m.value}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="padding:24px 28px;background:linear-gradient(135deg,#0f766e,#0e7490);color:#ffffff;">
      <p style="margin:0 0 4px;font-size:12px;opacity:0.85;text-transform:uppercase;letter-spacing:0.05em;">${opts.frequency} report</p>
      <h1 style="margin:0;font-size:20px;font-weight:600;">${opts.reportName}</h1>
      <p style="margin:8px 0 0;font-size:13px;opacity:0.85;">${opts.orgName} · ${opts.tabLabel}</p>
    </div>
    <div style="padding:24px 28px;">
      <table style="width:100%;border-collapse:collapse;">${metricRows}</table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${opts.appUrl}/reports-analytics" style="display:inline-block;padding:10px 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View live dashboard</a>
      </div>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;text-align:center;">
        You are receiving this because you were added as a recipient of "${opts.reportName}".
      </p>
    </div>
  </div>
</body></html>`;
}

/** Compute a small set of headline numbers to embed in the email. */
async function computeOverviewMetrics(supabase: any, orgId: string) {
  const [{ count: totalBen }, { count: activeBen }, { data: donations }, { data: expenses }] =
    await Promise.all([
      supabase
        .from("beneficiaries")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .is("deleted_at", null),
      supabase
        .from("beneficiaries")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .eq("status", "active"),
      supabase.from("beneficiary_donors").select("amount_received").eq("organization_id", orgId),
      supabase.from("expenses").select("amount").eq("organization_id", orgId),
    ]);

  const totalDonations = (donations ?? []).reduce(
    (s: number, d: any) => s + Number(d.amount_received ?? 0),
    0,
  );
  const totalExpenses = (expenses ?? []).reduce(
    (s: number, e: any) => s + Number(e.amount ?? 0),
    0,
  );
  const fmt = new Intl.NumberFormat("en-US");
  const cur = (n: number) => `KES ${fmt.format(Math.round(n))}`;

  return [
    { label: "Total beneficiaries", value: fmt.format(totalBen ?? 0) },
    { label: "Active beneficiaries", value: fmt.format(activeBen ?? 0) },
    { label: "Lifetime sponsorship received", value: cur(totalDonations) },
    { label: "Lifetime expenses", value: cur(totalExpenses) },
    {
      label: "Net position",
      value: cur(totalDonations - totalExpenses),
    },
  ];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { subscription_id, run_due } = (await req.json().catch(() => ({}))) as {
      subscription_id?: string;
      run_due?: boolean;
    };

    // Determine which subscriptions to process
    let subs: any[] = [];
    if (subscription_id) {
      const { data, error } = await supabase
        .from("analytics_report_subscriptions")
        .select("*, organizations(name)")
        .eq("id", subscription_id)
        .limit(1);
      if (error) throw error;
      subs = data ?? [];
    } else if (run_due) {
      const { data, error } = await supabase
        .from("analytics_report_subscriptions")
        .select("*, organizations(name)")
        .eq("is_active", true)
        .lte("next_send_at", new Date().toISOString());
      if (error) throw error;
      subs = data ?? [];
    } else {
      return new Response(
        JSON.stringify({ error: "subscription_id or run_due required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const appUrl = req.headers.get("origin") ?? "https://ufanisi-dms.lovable.app";
    const results: { id: string; status: string; recipients: number; error?: string }[] = [];

    for (const sub of subs) {
      try {
        const orgName = sub.organizations?.name ?? "Your organization";
        const tabLabel = TAB_LABELS[sub.tab] ?? "Analytics";
        const metrics = await computeOverviewMetrics(supabase, sub.organization_id);
        const html = buildEmailHtml({
          orgName,
          reportName: sub.name,
          tabLabel,
          frequency: sub.frequency,
          appUrl,
          metrics,
        });

        await resend.emails.send({
          from: "Ufanisi Analytics <onboarding@resend.dev>",
          to: sub.recipients,
          subject: `${sub.name} — ${tabLabel} (${sub.frequency})`,
          html,
        });

        const next = nextSendDate(sub.frequency);
        await supabase
          .from("analytics_report_subscriptions")
          .update({ last_sent_at: new Date().toISOString(), next_send_at: next })
          .eq("id", sub.id);

        await supabase.from("analytics_report_runs").insert({
          subscription_id: sub.id,
          organization_id: sub.organization_id,
          status: "sent",
          recipients_count: sub.recipients.length,
        });

        results.push({ id: sub.id, status: "sent", recipients: sub.recipients.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await supabase.from("analytics_report_runs").insert({
          subscription_id: sub.id,
          organization_id: sub.organization_id,
          status: "failed",
          recipients_count: sub.recipients.length,
          error_message: message,
        });
        results.push({ id: sub.id, status: "failed", recipients: sub.recipients.length, error: message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);