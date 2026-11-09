import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { deliver } from "../_shared/delivery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_DAYS = [30, 14, 7, 1];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch pending grant reports with due dates
    const { data: reports, error } = await supabase
      .from("grant_reports")
      .select("id, title, due_date, grant_id, organization_id, grants(grant_name, donor_name)")
      .not("status", "in", '("submitted","approved")')
      .not("due_date", "is", null);

    if (error) throw error;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let sentCount = 0;

    for (const report of reports || []) {
      const dueDate = new Date(report.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / 86400000);

      let reminderType: string | null = null;
      if (daysUntilDue < 0) reminderType = 'overdue';
      else if (REMINDER_DAYS.includes(daysUntilDue)) reminderType = `${daysUntilDue}_day`;

      if (!reminderType) continue;

      // Check for duplicate
      const { data: existing } = await supabase
        .from("grant_reminder_logs")
        .select("id")
        .eq("grant_report_id", report.id)
        .eq("reminder_type", reminderType)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Get org admins and program managers
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id, profiles(email, full_name)")
        .eq("organization_id", report.organization_id)
        .in("role", ["admin", "program_manager"]);

      const emails = (members || [])
        .map((m: any) => m.profiles?.email)
        .filter(Boolean);

      if (emails.length === 0) continue;

      const grantInfo = report.grants as any;
      const grantName = grantInfo?.grant_name || "Grant";
      const daysLabel = daysUntilDue < 0
        ? `${Math.abs(daysUntilDue)} days overdue`
        : `due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;
      const esc = (v: string) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[c]);
      let anySent = false;
      for (const m of (members || []) as any[]) {
        const email = m.profiles?.email;
        if (!email) continue;
        const r = await deliver(supabase, {
          organizationId: report.organization_id, channel: "email", source: "grant-deadline-reminders",
          idempotencyKey: `grant-reminder:${report.id}:${reminderType}:${String(email).toLowerCase()}`,
          to: email, recipientUserId: m.user_id, transactional: true,
          subject: `[ACTION REQUIRED] Grant report ${daysLabel} — ${grantName}`,
          html: `<h2>Grant Report Reminder</h2><p>The report <strong>${esc(report.title || 'Untitled')}</strong> for grant <strong>${esc(grantName)}</strong> is ${daysLabel}.</p><p>Due date: ${new Date(report.due_date).toLocaleDateString('en-KE')}</p><p>Please submit the report as soon as possible to maintain compliance.</p>`,
          linkPath: "/grants",
        });
        if (r.status === "sent" || r.duplicate) anySent = true;
        else console.error("grant reminder delivery", r.status, r.error);
      }
      if (!anySent) continue; // nothing actually sent: do not log, so the next run retries

      // Log reminder
      await supabase.from("grant_reminder_logs").insert({
        grant_report_id: report.id,
        reminder_type: reminderType,
        sent_to: emails,
        channel: "email",
      });

      // In-app notification (to alert_instances)
      await supabase.from("alert_instances").insert({
        organization_id: report.organization_id,
        title: `Grant report ${daysLabel}`,
        message: `Report "${report.title}" for ${grantName} is ${daysLabel}. Due: ${new Date(report.due_date).toLocaleDateString('en-KE')}`,
        severity: daysUntilDue < 0 ? "critical" : daysUntilDue <= 7 ? "high" : "medium",
        category: "grant_deadline",
        related_entity_type: "grant_reports",
        related_entity_id: report.id,
      });

      sentCount++;
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Grant reminder error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
