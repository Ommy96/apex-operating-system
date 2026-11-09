import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CheckSquare, AlarmClock, ClipboardList, ShieldCheck, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { isClosedWorkStatus, isOverdueTask } from "@/lib/workManagement";
import { useBeneficiaryTerminology } from "@/hooks/useBeneficiaryTerminology";

/** Age bands used for the overview demographic summary. */
export const AGE_BANDS = [
  { label: "0–5", min: 0, max: 5 },
  { label: "6–12", min: 6, max: 12 },
  { label: "13–17", min: 13, max: 17 },
  { label: "18–24", min: 18, max: 24 },
  { label: "25+", min: 25, max: 200 },
] as const;

export function ageFromDob(dob: string | null, today = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

export function summariseDemographics(rows: { gender: string | null; date_of_birth: string | null }[], today = new Date()) {
  const gender = { female: 0, male: 0, other: 0 };
  const bands = AGE_BANDS.map(b => ({ label: b.label, count: 0 }));
  let unknownAge = 0;
  for (const r of rows) {
    const g = (r.gender || "").trim().toLowerCase();
    if (g === "female" || g === "f") gender.female++;
    else if (g === "male" || g === "m") gender.male++;
    else gender.other++;
    const age = ageFromDob(r.date_of_birth, today);
    if (age == null) { unknownAge++; continue; }
    const idx = AGE_BANDS.findIndex(b => age >= b.min && age <= b.max);
    if (idx >= 0) bands[idx].count++;
  }
  return { gender, bands, unknownAge, total: rows.length };
}

export function ManagementPulse() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { can } = usePermissions();
  const { termPlural } = useBeneficiaryTerminology();
  const orgId = currentOrganization?.organization_id;

  const { data: work, isLoading: workLoading } = useQuery({
    queryKey: ["overview-work-pulse", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [tasks, cases, flags] = await Promise.all([
        supabase.from("staff_tasks").select("status, due_date").eq("organization_id", orgId!),
        supabase.from("beneficiary_cases").select("case_status").eq("organization_id", orgId!),
        supabase.from("data_quality_flags").select("id", { count: "exact", head: true })
          .eq("organization_id", orgId!).eq("is_resolved", false).is("deleted_at", null),
      ]);
      const err = tasks.error || cases.error || flags.error;
      if (err) {
        toast({ title: "Could not load workload summary", description: err.message, variant: "destructive" });
        throw err;
      }
      const t = tasks.data || [];
      return {
        openTasks: t.filter(x => !isClosedWorkStatus((x.status || "").toLowerCase())).length,
        overdueTasks: t.filter(x => isOverdueTask((x.status || "").toLowerCase(), x.due_date, today)).length,
        openCases: (cases.data || []).filter(x => !isClosedWorkStatus((x.case_status || "").toLowerCase())).length,
        qualityIssues: flags.count || 0,
      };
    },
  });

  const { data: demo, isLoading: demoLoading } = useQuery({
    queryKey: ["overview-demographics", orgId],
    enabled: !!orgId && can.viewBeneficiaries,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("gender, date_of_birth")
        .eq("organization_id", orgId!)
        .eq("status", "active")
        .is("deleted_at", null)
        .limit(5000);
      if (error) {
        toast({ title: "Could not load demographics", description: error.message, variant: "destructive" });
        throw error;
      }
      return summariseDemographics(data || []);
    },
  });

  const tiles = [
    { label: "Open tasks", value: work?.openTasks, icon: CheckSquare, href: "/tasks", show: can.viewTasks, tone: "text-primary" },
    { label: "Overdue tasks", value: work?.overdueTasks, icon: AlarmClock, href: "/tasks", show: can.viewTasks, tone: (work?.overdueTasks || 0) > 0 ? "text-destructive" : "text-primary" },
    { label: "Open cases", value: work?.openCases, icon: ClipboardList, href: "/cases", show: can.viewCases, tone: "text-primary" },
    { label: "Data quality issues", value: work?.qualityIssues, icon: ShieldCheck, href: "/me/data-quality", show: can.viewME, tone: (work?.qualityIssues || 0) > 0 ? "text-warning" : "text-primary" },
  ].filter(t => t.show);

  const maxBand = Math.max(...(demo?.bands.map(b => b.count) || [1]), 1);
  const g = demo?.gender;
  const gTotal = g ? g.female + g.male + g.other : 0;
  const pct = (n: number) => (gTotal ? Math.round((n / gTotal) * 100) : 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3 mb-4">
      <section className="rounded-xl border bg-card p-4">
        <header className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Operations pulse</h2>
            <p className="text-xs text-muted-foreground">Work needing management attention</p>
          </div>
        </header>
        <div className="grid grid-cols-2 gap-2">
          {tiles.map(t => (
            <button
              key={t.label}
              onClick={() => navigate(t.href)}
              className="group text-left rounded-lg border bg-background p-3 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center justify-between">
                <t.icon className={`h-4 w-4 ${t.tone}`} strokeWidth={1.75} />
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {workLoading ? <Skeleton className="h-6 w-12 mt-2" /> : (
                <p className={`mt-2 text-xl font-semibold tabular-nums ${t.tone}`}>{(t.value ?? 0).toLocaleString()}</p>
              )}
              <p className="text-xs text-muted-foreground">{t.label}</p>
            </button>
          ))}
        </div>
      </section>

      {can.viewBeneficiaries && (
        <section className="rounded-xl border bg-card p-4">
          <header className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Who we serve</h2>
              <p className="text-xs text-muted-foreground">Active {termPlural.toLowerCase()} by gender and age</p>
            </div>
            <button onClick={() => navigate("/analytics")} className="text-xs font-medium text-primary hover:underline">
              Open analytics
            </button>
          </header>
          {demoLoading || !demo ? (
            <div className="space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : demo.total === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No active {termPlural.toLowerCase()} yet</p>
          ) : (
            <>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-label="Gender split">
                <div className="bg-primary" style={{ width: `${pct(g!.female)}%` }} />
                <div className="bg-foreground/60" style={{ width: `${pct(g!.male)}%` }} />
                <div className="bg-muted-foreground/40" style={{ width: `${pct(g!.other)}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span><span className="inline-block h-2 w-2 rounded-full bg-primary mr-1" />Female {g!.female} ({pct(g!.female)}%)</span>
                <span><span className="inline-block h-2 w-2 rounded-full bg-foreground/60 mr-1" />Male {g!.male} ({pct(g!.male)}%)</span>
                <span><span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 mr-1" />Other / not recorded {g!.other}</span>
              </div>
              <div className="mt-4 grid grid-cols-5 items-end gap-2 h-20">
                {demo.bands.map(b => (
                  <div key={b.label} className="flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] tabular-nums text-foreground">{b.count}</span>
                    <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max((b.count / maxBand) * 100, 3)}%` }} />
                    <span className="text-[10px] text-muted-foreground">{b.label}</span>
                  </div>
                ))}
              </div>
              {demo.unknownAge > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {demo.unknownAge} without a date of birth are excluded from age bands.
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
