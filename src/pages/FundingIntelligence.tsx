import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, AlertTriangle, CalendarClock, Layers, Activity, Coins, FileText, ChevronRight
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import {
  useProgramFundingSummaries, useProjectFundingSummaries, useOrgGrants, useFundingHealthScore,
} from "@/hooks/useFundingIntelligence";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { RestrictionBadge } from "@/components/funding/RestrictionBadge";
import { Lock, LockOpen } from "lucide-react";
import { FundingHealthBadge } from "@/components/finance/FundingHealthBadge";
import { CHART_PALETTE } from "@/lib/chartPalette";
import { differenceInDays, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

export default function FundingIntelligence() {
  const { data: programs = [], isLoading: lp } = useProgramFundingSummaries();
  const { data: projects = [], isLoading: lpr } = useProjectFundingSummaries();
  const { data: grants = [], isLoading: lg } = useOrgGrants();
  const { currentOrganization } = useOrganization();

  // Live restricted vs unrestricted totals from allocation-engine pools + allocations.
  // These are compliance-grade — never merged into a single "committed" figure.
  const { data: restrictionRollup } = useQuery({
    queryKey: ["funding-restriction-rollup", currentOrganization?.organization_id],
    enabled: !!currentOrganization?.organization_id,
    queryFn: async () => {
      const orgId = currentOrganization!.organization_id;
      const [pools, allocs] = await Promise.all([
        supabase
          .from("donor_pools")
          .select("restriction, balance_base")
          .eq("organization_id", orgId),
        supabase
          .from("allocations")
          .select("restriction, amount_base, status")
          .eq("organization_id", orgId)
          .eq("status", "active"),
      ]);
      const acc = {
        restricted_pool: 0, unrestricted_pool: 0, time_restricted_pool: 0,
        restricted_alloc: 0, unrestricted_alloc: 0, time_restricted_alloc: 0,
      };
      (pools.data ?? []).forEach((p: any) => {
        const k = `${p.restriction || "restricted"}_pool` as keyof typeof acc;
        acc[k] = (acc[k] || 0) + Number(p.balance_base || 0);
      });
      (allocs.data ?? []).forEach((a: any) => {
        const k = `${a.restriction || "restricted"}_alloc` as keyof typeof acc;
        acc[k] = (acc[k] || 0) + Number(a.amount_base || 0);
      });
      return acc;
    },
  });

  // ===== Overview totals =====
  const totals = useMemo(() => {
    let received = 0, spent = 0, budget = 0, committed = 0;
    programs.forEach((p) => {
      received += Number(p.total_received) || 0;
      spent += Number(p.total_spent) || 0;
      budget += Number(p.total_budget) || 0;
      committed +=
        (Number(p.program_level_funding) || 0) +
        (Number(p.project_level_funding) || 0) +
        (Number(p.beneficiary_level_funding) || 0);
    });
    let grantPledged = 0, grantReceived = 0, restricted = 0, unrestricted = 0;
    grants.forEach((g: any) => {
      grantPledged += Number(g.grant_amount) || 0;
      grantReceived += Number(g.amount_received) || 0;
      const isRestricted = g.supported_funding_model && g.supported_funding_model !== "general";
      if (isRestricted) restricted += Number(g.grant_amount) || 0;
      else unrestricted += Number(g.grant_amount) || 0;
    });
    return {
      received, spent, budget, committed,
      grantPledged, grantReceived,
      pending: Math.max(0, grantPledged - grantReceived),
      restricted, unrestricted,
    };
  }, [programs, grants]);

  // Compliance-grade restricted/unrestricted (from live pools + allocations).
  const compliance = useMemo(() => {
    const r = restrictionRollup ?? {} as any;
    const restrictedTotal = (r.restricted_pool || 0) + (r.restricted_alloc || 0);
    const unrestrictedTotal = (r.unrestricted_pool || 0) + (r.unrestricted_alloc || 0);
    const timeRestrictedTotal = (r.time_restricted_pool || 0) + (r.time_restricted_alloc || 0);
    return { restrictedTotal, unrestrictedTotal, timeRestrictedTotal };
  }, [restrictionRollup]);

  const statusBreakdown = [
    { name: "Pledged", value: totals.grantPledged },
    { name: "Received", value: totals.grantReceived },
    { name: "Pending", value: totals.pending },
    { name: "Committed", value: totals.committed },
    { name: "Restricted", value: totals.restricted },
    { name: "Unrestricted", value: totals.unrestricted },
  ];

  // ===== Needs attention =====
  const needsAttention = useMemo(() => {
    const items: { id: string; type: string; title: string; subtitle: string; severity: "high" | "medium" | "low"; href?: string }[] = [];
    programs.forEach((p) => {
      const committed = Number(p.program_level_funding) + Number(p.project_level_funding) + Number(p.beneficiary_level_funding);
      const budget = Number(p.total_budget) || 0;
      const gap = budget - committed;
      if (budget > 0 && committed / budget < 0.6) {
        items.push({
          id: p.program_id, type: "Underfunded program", title: p.name,
          subtitle: `Only ${Math.round((committed / budget) * 100)}% covered · gap ${fmt(gap)}`,
          severity: committed / budget < 0.3 ? "high" : "medium",
          href: `/programs/${p.program_id}`,
        });
      }
      if (p.total_received > 0 && p.total_spent / p.total_received > 1.1) {
        items.push({
          id: `${p.program_id}-burn`, type: "Overspending", title: p.name,
          subtitle: `Spent ${fmt(p.total_spent)} vs received ${fmt(p.total_received)}`,
          severity: "high", href: `/programs/${p.program_id}`,
        });
      }
    });
    projects.forEach((pr) => {
      const budget = Number(pr.total_budget) || 0;
      const recv = Number(pr.total_received) || 0;
      if (budget > 0 && recv / budget < 0.5) {
        items.push({
          id: pr.project_id, type: "Project shortfall risk", title: pr.name,
          subtitle: `${Math.round((recv / budget) * 100)}% funded · short ${fmt(budget - recv)}`,
          severity: recv / budget < 0.25 ? "high" : "medium",
          href: `/projects/${pr.project_id}`,
        });
      }
    });
    grants.forEach((g: any) => {
      if (!g.end_date) return;
      const days = differenceInDays(parseISO(g.end_date), new Date());
      if (days >= 0 && days <= 90) {
        items.push({
          id: g.id, type: "Grant expiring", title: g.grant_name,
          subtitle: `${g.donor_name || "Donor"} · ends in ${days} days`,
          severity: days <= 30 ? "high" : "medium",
        });
      }
    });
    return items.sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1));
  }, [programs, projects, grants]);

  // ===== Compliance calendar =====
  const upcomingReports = useMemo(() => {
    return grants
      .filter((g: any) => g.next_report_due)
      .map((g: any) => ({
        ...g,
        days: differenceInDays(parseISO(g.next_report_due), new Date()),
      }))
      .sort((a: any, b: any) => a.days - b.days);
  }, [grants]);

  const isLoading = lp || lpr || lg;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funding Intelligence"
        description="Hybrid funding map, gaps, compliance and health across the whole organization"
        icon={Coins}
      />

      {/* Needs attention */}
      <Card className="border-warning/40 bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Needs attention
            <Badge variant="secondary" className="ml-2">{needsAttention.length}</Badge>
          </CardTitle>
          <CardDescription>Prioritized funding risks across your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : needsAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">No urgent funding issues. Everything looks healthy.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {needsAttention.slice(0, 12).map((item) => (
                <AttentionRow key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full sm:w-auto sm:inline-flex grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview" className="gap-2"><TrendingUp className="h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="map" className="gap-2"><Layers className="h-4 w-4" />Hybrid Map</TabsTrigger>
          <TabsTrigger value="gaps" className="gap-2"><Activity className="h-4 w-4" />Gaps & Burn</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2"><FileText className="h-4 w-4" />Compliance</TabsTrigger>
        </TabsList>

        {/* ===== Overview ===== */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatTile label="Total budget" value={totals.budget} />
            <StatTile label="Committed" value={totals.committed} />
            <StatTile label="Received" value={totals.received} />
            <StatTile label="Pending" value={totals.pending} />
            <StatTile label="Restricted" value={totals.restricted} />
            <StatTile label="Unrestricted" value={totals.unrestricted} />
          </div>

          {/* Compliance-grade split: pools + active allocations, never merged */}
          <Card className="border-amber-500/30 bg-amber-500/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600" /> Restricted vs Unrestricted balances
              </CardTitle>
              <CardDescription>
                Compliance view — restricted funds must be used for their stated purpose and are reported separately.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  <Lock className="h-3.5 w-3.5" /> Restricted
                </div>
                <p className="text-2xl font-semibold mt-1">{fmt(compliance.restrictedTotal)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Must be used for stated purpose.</p>
              </div>
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                  <LockOpen className="h-3.5 w-3.5" /> Unrestricted
                </div>
                <p className="text-2xl font-semibold mt-1">{fmt(compliance.unrestrictedTotal)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Available wherever most needed.</p>
              </div>
              <div className="rounded-md border border-sky-500/40 bg-sky-500/10 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-sky-800 dark:text-sky-300">
                  <CalendarClock className="h-3.5 w-3.5" /> Time-restricted
                </div>
                <p className="text-2xl font-semibold mt-1">{fmt(compliance.timeRestrictedTotal)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Usable within a defined period.</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-base">Funding by status</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {statusBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-base">Restricted vs unrestricted</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Restricted", value: totals.restricted },
                        { name: "Unrestricted", value: totals.unrestricted },
                      ]}
                      dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}
                    >
                      <Cell fill={CHART_PALETTE[0]} />
                      <Cell fill={CHART_PALETTE[2]} />
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== Hybrid funding map ===== */}
        <TabsContent value="map" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            How funding flows into each program: program-level grants, project-level grants, and beneficiary sponsorships.
          </p>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : programs.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No programs found.</CardContent></Card>
          ) : (
            <>
              <Card className="border-border/60">
                <CardContent className="pt-6 h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={programs.map(p => ({
                      name: p.name.length > 18 ? p.name.slice(0, 16) + "…" : p.name,
                      "Program-level": Number(p.program_level_funding),
                      "Project-level": Number(p.project_level_funding),
                      "Beneficiary-level": Number(p.beneficiary_level_funding),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Legend />
                      <Bar dataKey="Program-level" stackId="a" fill={CHART_PALETTE[0]} />
                      <Bar dataKey="Project-level" stackId="a" fill={CHART_PALETTE[1]} />
                      <Bar dataKey="Beneficiary-level" stackId="a" fill={CHART_PALETTE[2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {programs.map((p) => <ProgramFundingCard key={p.program_id} program={p} />)}
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== Gaps & burn ===== */}
        <TabsContent value="gaps" className="mt-6 space-y-4">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-3">
              {programs.map((p) => {
                const committed = Number(p.program_level_funding) + Number(p.project_level_funding) + Number(p.beneficiary_level_funding);
                const budget = Number(p.total_budget) || 0;
                const received = Number(p.total_received) || 0;
                const spent = Number(p.total_spent) || 0;
                const gap = Math.max(0, budget - committed);
                const coverage = budget > 0 ? Math.min(100, (committed / budget) * 100) : 0;
                const burn = received > 0 ? Math.min(100, (spent / received) * 100) : 0;
                return (
                  <Card key={p.program_id} className="border-border/60">
                    <CardContent className="pt-5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Link to={`/programs/${p.program_id}`} className="font-semibold hover:underline">{p.name}</Link>
                        <Badge variant={coverage >= 80 ? "secondary" : coverage >= 50 ? "outline" : "destructive"}>
                          {Math.round(coverage)}% covered
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <KV label="Budget" value={fmt(budget)} />
                        <KV label="Committed" value={fmt(committed)} />
                        <KV label="Received" value={fmt(received)} />
                        <KV label="Gap" value={fmt(gap)} accent={gap > 0 ? "text-destructive" : "text-success"} />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs"><span>Coverage</span><span>{Math.round(coverage)}%</span></div>
                        <Progress value={coverage} className="h-1.5" />
                        <div className="flex items-center justify-between text-xs mt-2"><span>Burn rate</span><span>{Math.round(burn)}%</span></div>
                        <Progress value={burn} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== Compliance ===== */}
        <TabsContent value="compliance" className="mt-6 space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4" />Upcoming reporting deadlines</CardTitle>
              <CardDescription>Reminders for grants with reporting due</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reporting deadlines on file.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingReports.slice(0, 20).map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{g.grant_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{g.donor_name} · {g.reporting_frequency || "reporting"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{format(parseISO(g.next_report_due), "MMM d, yyyy")}</p>
                        <p className={cn("text-xs",
                          g.days < 0 ? "text-destructive" : g.days <= 14 ? "text-warning" : "text-muted-foreground"
                        )}>{g.days < 0 ? `${Math.abs(g.days)}d overdue` : `${g.days}d left`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Grant conditions & utilization</CardTitle>
              <CardDescription>Existing grant compliance notes and utilization snapshot</CardDescription>
            </CardHeader>
            <CardContent>
              {grants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No grants on file.</p>
              ) : (
                <div className="space-y-3">
                  {grants.map((g: any) => {
                    const util = Number(g.grant_amount) > 0 ? (Number(g.amount_received) / Number(g.grant_amount)) * 100 : 0;
                    return (
                      <div key={g.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{g.grant_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{g.donor_name}</p>
                          </div>
                          <Badge variant="outline">{g.status || "—"}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmt(Number(g.amount_received) || 0)} of {fmt(Number(g.grant_amount) || 0)} {g.currency || ""} received
                        </div>
                        <Progress value={Math.min(100, util)} className="h-1.5" />
                        {g.compliance_notes && <p className="text-xs text-muted-foreground italic">{g.compliance_notes}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-4 pb-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold mt-1">{fmt(value)}</p>
      </CardContent>
    </Card>
  );
}

function KV({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-semibold", accent)}>{value}</p>
    </div>
  );
}

function AttentionRow({ item }: { item: any }) {
  const sev = item.severity === "high" ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5";
  const inner = (
    <div className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-2", sev)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={item.severity === "high" ? "destructive" : "outline"} className="text-[10px]">{item.type}</Badge>
          <p className="font-medium truncate">{item.title}</p>
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
      </div>
      {item.href && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </div>
  );
  return item.href ? <Link to={item.href}>{inner}</Link> : inner;
}

function ProgramFundingCard({ program }: { program: any }) {
  const total = Number(program.program_level_funding) + Number(program.project_level_funding) + Number(program.beneficiary_level_funding);
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <Link to={`/programs/${program.program_id}`} className="font-semibold hover:underline truncate">{program.name}</Link>
          <Badge variant="outline">{program.donor_count} donors</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <FundingBar label="Program-level" value={Number(program.program_level_funding)} total={total} color={CHART_PALETTE[0]} />
        <FundingBar label="Project-level" value={Number(program.project_level_funding)} total={total} color={CHART_PALETTE[1]} />
        <FundingBar label="Beneficiary-level" value={Number(program.beneficiary_level_funding)} total={total} color={CHART_PALETTE[2]} />
        <div className="pt-2">
          <FundingHealthBadge programId={program.program_id} compact />
        </div>
      </CardContent>
    </Card>
  );
}

function FundingBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{fmt(value)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}