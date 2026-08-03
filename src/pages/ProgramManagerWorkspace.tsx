import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useManagedPrograms } from "@/hooks/useManagedPrograms";
import { useProgramRollups } from "@/hooks/useProgramRollups";
import { ProgramFunding } from "@/components/programs/ProgramFunding";
import { RestrictionBadge } from "@/components/funding/RestrictionBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Layers, AlertTriangle, TrendingDown, HandCoins, Users, ArrowRight,
  FolderKanban, DollarSign, Activity, ShieldAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const sb = supabase as any;
const LS_KEY = "program_workspace.last_program";

const fmt = (n: number, ccy = "KES") =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: ccy, maximumFractionDigits: 0 })
    .format(Number.isFinite(n) ? n : 0);

/**
 * Program Manager workspace — the strategic layer above the single-project
 * Project Lead workspace. Portfolio / Attention / Rollup / Funding / Team.
 */
export default function ProgramManagerWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data: managed, isLoading: mpLoading } = useManagedPrograms();
  const programs = managed?.programs ?? [];
  const [programId, setProgramId] = useState<string | null>(null);

  useEffect(() => {
    if (programId || !programs.length) return;
    const saved = localStorage.getItem(LS_KEY);
    const found = programs.find((p) => p.id === saved) || programs[0];
    setProgramId(found.id);
  }, [programs, programId]);
  useEffect(() => { if (programId) localStorage.setItem(LS_KEY, programId); }, [programId]);

  const program = programs.find((p) => p.id === programId) || null;

  if (mpLoading) return <div className="p-6 space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;

  if (!programs.length) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>My Programme</CardTitle>
            <CardDescription>
              You are not currently assigned as a Program Manager on any programme in this organisation.
              Ask an admin to set you as the programme manager or add you to the programme team.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold">Programme Manager Workspace</h1>
          </div>
          <p className="text-sm text-muted-foreground">Strategic view across every project in your programme.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={programId ?? ""} onValueChange={setProgramId}>
            <SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Choose programme…" /></SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {program && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/programs/dashboard/${program.id}`)}>
              Open programme dashboard <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {program && (
        <Tabs defaultValue="portfolio" className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="portfolio"><FolderKanban className="h-4 w-4 mr-1" />Portfolio</TabsTrigger>
            <TabsTrigger value="attention"><AlertTriangle className="h-4 w-4 mr-1" />Attention</TabsTrigger>
            <TabsTrigger value="rollup"><TrendingDown className="h-4 w-4 mr-1" />Roll-up</TabsTrigger>
            <TabsTrigger value="funding"><HandCoins className="h-4 w-4 mr-1" />Funding</TabsTrigger>
            <TabsTrigger value="team"><Users className="h-4 w-4 mr-1" />Team</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio"><PortfolioPanel programId={program.id} orgId={orgId!} /></TabsContent>
          <TabsContent value="attention"><AttentionPanel programId={program.id} orgId={orgId!} /></TabsContent>
          <TabsContent value="rollup"><RollupPanel programId={program.id} orgId={orgId!} /></TabsContent>
          <TabsContent value="funding"><ProgramFunding programId={program.id} /></TabsContent>
          <TabsContent value="team"><TeamPanel programId={program.id} orgId={orgId!} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Portfolio: every project + burn rate, funding coverage, indicator health */
/* ------------------------------------------------------------------ */
function PortfolioPanel({ programId, orgId }: { programId: string; orgId: string }) {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["pmw-portfolio", programId, orgId],
    queryFn: async () => {
      const { data: projects = [] } = await sb
        .from("projects")
        .select("id,name,status,budget,currency,start_date,end_date,project_lead_id")
        .eq("organization_id", orgId).eq("program_id", programId).is("deleted_at", null);
      const projectIds = (projects as any[]).map((p) => p.id);
      if (!projectIds.length) return { projects: [], summary: {} as Record<string, any> };

      const [expensesRes, allocsRes, indRes] = await Promise.all([
        sb.from("financial_transactions").select("project_id,amount")
          .in("project_id", projectIds).eq("transaction_type", "expense"),
        sb.from("allocations").select("project_id,amount_base,restriction")
          .in("project_id", projectIds),
        sb.from("indicators").select("id,project_id,target_value,current_value,is_active")
          .in("project_id", projectIds),
      ]);
      const spendByProject: Record<string, number> = {};
      for (const r of (expensesRes.data || []) as any[])
        spendByProject[r.project_id] = (spendByProject[r.project_id] || 0) + Number(r.amount || 0);
      const allocByProject: Record<string, { total: number; restricted: number }> = {};
      for (const r of (allocsRes.data || []) as any[]) {
        const cur = allocByProject[r.project_id] || { total: 0, restricted: 0 };
        cur.total += Number(r.amount_base || 0);
        if (r.restriction === "restricted") cur.restricted += Number(r.amount_base || 0);
        allocByProject[r.project_id] = cur;
      }
      const indByProject: Record<string, { on: number; off: number }> = {};
      for (const i of (indRes.data || []) as any[]) {
        if (!i.is_active || !i.target_value) continue;
        const pct = (Number(i.current_value || 0) / Number(i.target_value)) * 100;
        const cur = indByProject[i.project_id] || { on: 0, off: 0 };
        if (pct >= 50) cur.on += 1; else cur.off += 1;
        indByProject[i.project_id] = cur;
      }
      return { projects, spendByProject, allocByProject, indByProject };
    },
  });

  if (q.isLoading) return <Skeleton className="h-72 w-full" />;
  const data = q.data!;
  if (!data.projects.length)
    return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No projects in this programme yet.</CardContent></Card>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Portfolio</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className="text-right">Allocated</TableHead>
            <TableHead className="text-right">Spent</TableHead>
            <TableHead>Coverage</TableHead>
            <TableHead>Indicators</TableHead>
            <TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {(data.projects as any[]).map((p) => {
              const budget = Number(p.budget || 0);
              const alloc = data.allocByProject?.[p.id]?.total || 0;
              const restricted = data.allocByProject?.[p.id]?.restricted || 0;
              const spent = data.spendByProject?.[p.id] || 0;
              const coverage = budget ? Math.round((alloc / budget) * 100) : 0;
              const burn = budget ? Math.round((spent / budget) * 100) : 0;
              const ind = data.indByProject?.[p.id] || { on: 0, off: 0 };
              const total = ind.on + ind.off;
              return (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{p.status || "—"}</Badge></TableCell>
                  <TableCell className="text-right">{fmt(budget, p.currency || "KES")}</TableCell>
                  <TableCell className="text-right">
                    {fmt(alloc)}
                    {restricted > 0 && (
                      <div className="mt-0.5"><RestrictionBadge restriction="restricted" /></div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{fmt(spent)} <span className="text-xs text-muted-foreground">({burn}%)</span></TableCell>
                  <TableCell className="min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(coverage, 100)} className="h-2 flex-1" />
                      <span className="text-xs tabular-nums w-10 text-right">{coverage}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {total === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                      <span className="text-xs">
                        <span className="text-success font-medium">{ind.on}</span>
                        {" / "}
                        <span className="text-destructive font-medium">{ind.off}</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/dashboard/${p.id}`)}>
                      Open <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Attention: under-funded, overdue reports, declining indicators, held allocations */
/* ------------------------------------------------------------------ */
function AttentionPanel({ programId, orgId }: { programId: string; orgId: string }) {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["pmw-attention", programId, orgId],
    queryFn: async () => {
      const { data: projects = [] } = await sb
        .from("projects").select("id,name,budget")
        .eq("organization_id", orgId).eq("program_id", programId).is("deleted_at", null);
      const ids = (projects as any[]).map((p) => p.id);
      if (!ids.length) return { underfunded: [], overdue: [], declining: [], held: [] };

      const today = new Date().toISOString().slice(0, 10);
      const [allocsRes, reportsRes, indRes, poolsRes] = await Promise.all([
        sb.from("allocations").select("project_id,amount_base").in("project_id", ids),
        sb.from("project_narrative_reports").select("project_id,status,due_date").in("project_id", ids)
          .neq("status", "approved").lt("due_date", today),
        sb.from("indicators").select("project_id,name,current_value,target_value,is_active").in("project_id", ids),
        sb.from("donor_pools").select("id,program_id,balance_base,status,restriction")
          .eq("program_id", programId).eq("status", "held"),
      ]);
      const allocByProj: Record<string, number> = {};
      for (const r of (allocsRes.data || []) as any[])
        allocByProj[r.project_id] = (allocByProj[r.project_id] || 0) + Number(r.amount_base || 0);

      const underfunded = (projects as any[]).map((p) => ({
        id: p.id, name: p.name,
        gap: Number(p.budget || 0) - (allocByProj[p.id] || 0),
        coverage: Number(p.budget || 0) ? Math.round(((allocByProj[p.id] || 0) / Number(p.budget)) * 100) : 0,
      })).filter((r) => r.gap > 0 && r.coverage < 80);

      const overdue = (reportsRes.data as any[]) || [];
      const projectNames: Record<string, string> = {};
      for (const p of projects as any[]) projectNames[p.id] = p.name;

      const declining = ((indRes.data || []) as any[])
        .filter((i) => i.is_active && i.target_value && (Number(i.current_value || 0) / Number(i.target_value)) < 0.5)
        .map((i) => ({ ...i, projectName: projectNames[i.project_id] }));

      return { underfunded, overdue: overdue.map((o) => ({ ...o, projectName: projectNames[o.project_id] })), declining, held: poolsRes.data || [] };
    },
  });

  if (q.isLoading) return <Skeleton className="h-72 w-full" />;
  const { underfunded = [], overdue = [], declining = [], held = [] } = q.data || {};

  const Section = ({ title, icon: Icon, empty, children }: any) => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4" />{title}</CardTitle></CardHeader>
      <CardContent>{(!children || (Array.isArray(children) && !children.length))
        ? <p className="text-xs text-muted-foreground">{empty}</p> : children}</CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Section title="Under-funded projects" icon={DollarSign} empty="Every project is at least 80% funded.">
        {underfunded.length > 0 && (
          <ul className="space-y-2">
            {underfunded.map((u: any) => (
              <li key={u.id} className="flex items-center justify-between gap-2 text-sm">
                <button className="text-left hover:underline" onClick={() => navigate(`/projects/dashboard/${u.id}`)}>{u.name}</button>
                <div className="flex items-center gap-2"><Badge variant="destructive">{u.coverage}%</Badge><span className="text-xs text-muted-foreground">gap {fmt(u.gap)}</span></div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Overdue narrative reports" icon={AlertTriangle} empty="No overdue reports.">
        {overdue.length > 0 && (
          <ul className="space-y-2">
            {overdue.map((o: any) => (
              <li key={o.id ?? `${o.project_id}-${o.due_date}`} className="flex items-center justify-between text-sm">
                <span>{o.projectName}</span>
                <span className="text-xs text-muted-foreground">due {formatDistanceToNow(new Date(o.due_date), { addSuffix: true })}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Declining indicators (<50% of target)" icon={TrendingDown} empty="No indicators below 50% of target.">
        {declining.length > 0 && (
          <ul className="space-y-2">
            {declining.slice(0, 10).map((i: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between text-sm">
                <span>{i.name} <span className="text-xs text-muted-foreground">· {i.projectName}</span></span>
                <Badge variant="destructive" className="text-[10px]">{Math.round((Number(i.current_value || 0) / Number(i.target_value)) * 100)}%</Badge>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Held allocations" icon={ShieldAlert} empty="No held allocations.">
        {held.length > 0 && (
          <ul className="space-y-2">
            {(held as any[]).map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span>Pool {p.id.slice(0, 8)}… <RestrictionBadge restriction={p.restriction || "unrestricted"} /></span>
                <span className="tabular-nums">{fmt(Number(p.balance_base || 0))}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rollup: normalized program indicators with drill-down */
/* ------------------------------------------------------------------ */
function RollupPanel({ programId, orgId }: { programId: string; orgId: string }) {
  const r = useProgramRollups(programId, orgId);
  if (r.isLoading) return <Skeleton className="h-56 w-full" />;
  const rollups = ((r as any).rollups ?? []) as any[];
  const translations = ((r as any).translations ?? []) as any[];

  if (!rollups.length)
    return (
      <Card><CardContent className="py-8 text-sm text-muted-foreground text-center">
        No cross-project rollups defined yet. Configure them in the programme dashboard's Roll-ups tab.
      </CardContent></Card>
    );

  return (
    <div className="space-y-3">
      {rollups.map((ru) => {
        const contribs = translations.filter((t) => t.rollup_indicator_id === ru.id);
        const pct = ru.target_value ? Math.min(100, Math.round((Number(ru.current_value || 0) / Number(ru.target_value)) * 100)) : null;
        return (
          <Card key={ru.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />{ru.name}</CardTitle>
                  <CardDescription className="text-xs">Normalized scale: {ru.normalized_scale}</CardDescription>
                </div>
                {pct !== null && <Badge variant={pct >= 80 ? "default" : pct >= 50 ? "secondary" : "destructive"}>{pct}% of target</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2">Contributing project indicators ({contribs.length})</div>
              {contribs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No project indicators mapped yet.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {contribs.map((c) => (
                    <li key={c.id} className="flex items-center justify-between border-b last:border-0 py-1">
                      <span>{c.source_indicator_name || c.source_indicator_id?.slice(0, 8)}</span>
                      <span className="text-xs text-muted-foreground">{c.source_type} → {ru.normalized_scale}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team: project leads and their recent field/activity signals */
/* ------------------------------------------------------------------ */
function TeamPanel({ programId, orgId }: { programId: string; orgId: string }) {
  const q = useQuery({
    queryKey: ["pmw-team", programId, orgId],
    queryFn: async () => {
      const { data: projects = [] } = await sb
        .from("projects").select("id,name,project_lead_id,project_manager_id")
        .eq("organization_id", orgId).eq("program_id", programId).is("deleted_at", null);
      const leadIds = [...new Set(((projects as any[]).flatMap((p) => [p.project_lead_id, p.project_manager_id]).filter(Boolean)))];
      let leads: Record<string, any> = {};
      if (leadIds.length) {
        const { data } = await sb.from("profiles").select("user_id,full_name,email,avatar_url").in("user_id", leadIds);
        leads = Object.fromEntries(((data || []) as any[]).map((p) => [p.user_id, p]));
      }
      const ids = (projects as any[]).map((p) => p.id);
      const { data: logs = [] } = ids.length
        ? await sb.from("field_logs").select("project_id,recorded_at,recorded_by").in("project_id", ids).order("recorded_at", { ascending: false }).limit(200)
        : { data: [] };
      const lastByProj: Record<string, string> = {};
      for (const l of (logs as any[])) if (!lastByProj[l.project_id]) lastByProj[l.project_id] = l.recorded_at;
      return { projects, leads, lastByProj };
    },
  });

  if (q.isLoading) return <Skeleton className="h-56 w-full" />;
  const { projects = [], leads = {}, lastByProj = {} } = q.data || {};
  if (!projects.length) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No projects in this programme.</CardContent></Card>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Team</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Project Lead</TableHead>
            <TableHead>Last field activity</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(projects as any[]).map((p) => {
              const lead = leads[p.project_lead_id || p.project_manager_id];
              const last = lastByProj[p.id];
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{lead ? <div><div className="text-sm">{lead.full_name || lead.email}</div><div className="text-xs text-muted-foreground">{lead.email}</div></div> : <span className="text-xs text-muted-foreground">Unassigned</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{last ? formatDistanceToNow(new Date(last), { addSuffix: true }) : "No field logs yet"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
