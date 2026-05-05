import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeader, StatCard } from "@/components/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Layers, Target, DollarSign, Users, Flag, ShieldAlert,
  TrendingUp, ArrowRight, Activity, CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";

const fmtCurrency = (n: number, ccy = "KES") =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n || 0);

const ProgramsPortfolio = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ["portfolio-rollup", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [programsRes, projectsRes, indicatorsRes, milestonesRes, risksRes, servicesRes, expensesRes] = await Promise.all([
        supabase.from("programs").select("id,name,status,total_budget,annual_funding_required,currency,start_date,end_date,primary_sector").eq("organization_id", orgId!).is("deleted_at", null),
        supabase.from("projects").select("id,program_id,status,budget").eq("organization_id", orgId!).is("deleted_at", null),
        supabase.from("program_indicators").select("id,program_id,target_value,current_value,is_active").eq("organization_id", orgId!),
        supabase.from("programme_milestones").select("id,program_id,status,due_date").eq("org_id", orgId!).is("deleted_at", null),
        supabase.from("program_risks").select("id,program_id,status,risk_score,impact,likelihood").eq("org_id", orgId!).is("deleted_at", null),
        supabase.from("beneficiary_services").select("beneficiary_id,program_id,status").eq("organization_id", orgId!).eq("status", "active"),
        supabase.from("financial_transactions").select("program_id,amount,transaction_type").eq("organization_id", orgId!).eq("transaction_type", "expense"),
      ]);

      if (programsRes.error) throw programsRes.error;
      const programs = programsRes.data || [];
      const projects = projectsRes.data || [];
      const indicators = indicatorsRes.data || [];
      const milestones = milestonesRes.data || [];
      const risks = risksRes.data || [];
      const services = servicesRes.data || [];
      const expenses = expensesRes.data || [];

      const rows = programs.map((p: any) => {
        const pProjects = projects.filter((x: any) => x.program_id === p.id);
        const pIndicators = indicators.filter((x: any) => x.program_id === p.id);
        const pMilestones = milestones.filter((x: any) => x.program_id === p.id);
        const pRisks = risks.filter((x: any) => x.program_id === p.id && x.status !== "closed");
        const pBenef = new Set(services.filter((x: any) => x.program_id === p.id).map((x: any) => x.beneficiary_id));
        const pSpend = expenses.filter((x: any) => x.program_id === p.id).reduce((s: number, x: any) => s + Number(x.amount || 0), 0);

        const indicatorPerf = pIndicators.length
          ? Math.round(
              pIndicators.reduce((s: number, i: any) => {
                const t = Number(i.target_value || 0);
                const c = Number(i.current_value || 0);
                return s + (t > 0 ? Math.min(100, (c / t) * 100) : 0);
              }, 0) / pIndicators.length,
            )
          : 0;

        const milestonesDone = pMilestones.filter((m: any) => m.status === "completed").length;
        const milestonesOverdue = pMilestones.filter((m: any) => m.status !== "completed" && m.due_date && new Date(m.due_date) < new Date()).length;
        const highRisks = pRisks.filter((r: any) => Number(r.risk_score || r.impact * r.likelihood) >= 12).length;
        const budget = Number(p.total_budget || 0);
        const utilization = budget > 0 ? Math.min(100, Math.round((pSpend / budget) * 100)) : 0;

        // Health: weighted of indicator perf, milestone completion, inverse-risk, utilization sanity
        const milestoneRate = pMilestones.length ? Math.round((milestonesDone / pMilestones.length) * 100) : 0;
        const riskPenalty = Math.min(40, highRisks * 10);
        const utilizationPenalty = utilization > 100 ? 15 : 0;
        const health = Math.max(0, Math.min(100, Math.round(indicatorPerf * 0.5 + milestoneRate * 0.4 + 10 - riskPenalty - utilizationPenalty)));

        return {
          id: p.id,
          name: p.name,
          status: p.status || "planning",
          sector: p.primary_sector,
          currency: p.currency || "KES",
          budget,
          spend: pSpend,
          utilization,
          projectCount: pProjects.length,
          indicatorPerf,
          beneficiaries: pBenef.size,
          milestonesTotal: pMilestones.length,
          milestonesDone,
          milestonesOverdue,
          openRisks: pRisks.length,
          highRisks,
          health,
        };
      });

      const totals = rows.reduce(
        (acc, r) => {
          acc.budget += r.budget;
          acc.spend += r.spend;
          acc.beneficiaries += r.beneficiaries;
          acc.projects += r.projectCount;
          acc.openRisks += r.openRisks;
          acc.highRisks += r.highRisks;
          acc.milestonesOverdue += r.milestonesOverdue;
          return acc;
        },
        { budget: 0, spend: 0, beneficiaries: 0, projects: 0, openRisks: 0, highRisks: 0, milestonesOverdue: 0 },
      );

      const avgIndicator = rows.length ? Math.round(rows.reduce((s, r) => s + r.indicatorPerf, 0) / rows.length) : 0;
      const avgHealth = rows.length ? Math.round(rows.reduce((s, r) => s + r.health, 0) / rows.length) : 0;

      return { rows, totals, avgIndicator, avgHealth };
    },
  });

  const sortedRows = useMemo(() => (data?.rows || []).slice().sort((a, b) => b.budget - a.budget), [data]);

  const healthBadge = (h: number) => {
    if (h >= 75) return { label: "Healthy", icon: CheckCircle2, cls: "bg-success/10 text-success border-success/20" };
    if (h >= 50) return { label: "At Risk", icon: AlertTriangle, cls: "bg-warning/10 text-warning border-warning/20" };
    return { label: "Critical", icon: AlertTriangle, cls: "bg-destructive/10 text-destructive border-destructive/20" };
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Portfolio Overview"
        description="Cross-program rollup of indicators, budgets, beneficiaries, milestones and risks"
        icon={Layers}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/programs-management")}>
            Manage Programs <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Programs" value={sortedRows.length} icon={Target} variant="primary" description={`${data?.totals.projects ?? 0} projects`} />
            <StatCard title="Total Budget" value={fmtCurrency(data?.totals.budget || 0)} icon={DollarSign} variant="info" description={`${fmtCurrency(data?.totals.spend || 0)} spent`} />
            <StatCard title="Active Beneficiaries" value={data?.totals.beneficiaries ?? 0} icon={Users} variant="success" />
            <StatCard title="Avg Indicator Perf" value={`${data?.avgIndicator ?? 0}%`} icon={TrendingUp} variant="warning" description={`Health ${data?.avgHealth ?? 0}/100`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Flag className="h-4 w-4 text-primary" /> Milestones Overdue</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{data?.totals.milestonesOverdue ?? 0}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-warning" /> Open Risks</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{data?.totals.openRisks ?? 0}<span className="text-sm text-muted-foreground font-normal ml-2">({data?.totals.highRisks ?? 0} high)</span></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-success" /> Budget Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.totals.budget ? Math.round((data.totals.spend / data.totals.budget) * 100) : 0}%
                </div>
                <Progress value={data?.totals.budget ? (data.totals.spend / data.totals.budget) * 100 : 0} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Program Rollup</CardTitle>
              <CardDescription>Click a program to drill down into its dashboard</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3">Program</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Status</th>
                      <th className="text-right px-4 py-3">Budget</th>
                      <th className="text-right px-4 py-3 hidden md:table-cell">Utilization</th>
                      <th className="text-right px-4 py-3 hidden lg:table-cell">Indicators</th>
                      <th className="text-right px-4 py-3 hidden lg:table-cell">Beneficiaries</th>
                      <th className="text-right px-4 py-3 hidden lg:table-cell">Milestones</th>
                      <th className="text-right px-4 py-3 hidden md:table-cell">Risks</th>
                      <th className="text-right px-4 py-3">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.length === 0 && (
                      <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No programs yet</td></tr>
                    )}
                    {sortedRows.map((r) => {
                      const hb = healthBadge(r.health);
                      const HIcon = hb.icon;
                      return (
                        <tr
                          key={r.id}
                          onClick={() => navigate(`/programs/dashboard/${r.id}`)}
                          className="border-t border-border hover:bg-muted/30 cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{r.name}</div>
                            <div className="text-xs text-muted-foreground">{r.sector || "—"} · {r.projectCount} projects</div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <Badge variant="secondary" className="capitalize">{r.status.replace("_", " ")}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{fmtCurrency(r.budget, r.currency)}</td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs tabular-nums">{r.utilization}%</span>
                              <Progress value={r.utilization} className="w-20 h-1.5" />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right hidden lg:table-cell tabular-nums">{r.indicatorPerf}%</td>
                          <td className="px-4 py-3 text-right hidden lg:table-cell tabular-nums">{r.beneficiaries}</td>
                          <td className="px-4 py-3 text-right hidden lg:table-cell tabular-nums">
                            {r.milestonesDone}/{r.milestonesTotal}
                            {r.milestonesOverdue > 0 && (
                              <span className="ml-2 inline-flex items-center gap-1 text-warning text-xs"><Clock className="h-3 w-3" />{r.milestonesOverdue}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right hidden md:table-cell tabular-nums">
                            {r.openRisks}{r.highRisks > 0 && <span className="ml-1 text-destructive">({r.highRisks})</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant="outline" className={hb.cls}>
                              <HIcon className="h-3 w-3 mr-1" />{r.health}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ProgramsPortfolio;