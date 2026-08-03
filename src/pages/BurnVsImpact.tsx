import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Play, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Period = "monthly" | "quarterly" | "yearly";
type Snap = {
  project_id: string;
  period: Period;
  period_start: string;
  period_end: string;
  burn_rate: number | null;
  impact_velocity: number | null;
  base_volume: number | null;
  allocated_base: number | null;
  budget_base: number | null;
  indicator_actual: number | null;
  indicator_planned: number | null;
  computed_at: string;
};
type Flag = {
  id: string;
  project_id: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  detail: any;
  detected_at: string;
};

const QUADRANTS = [
  { name: "Stars", color: "#0F7B6C", x: ">=1 burn", y: ">=1 impact" },
  { name: "Hidden gems", color: "#0EA5E9", x: "<1 burn", y: ">=1 impact" },
  { name: "Cash burners", color: "#DC2626", x: ">=1 burn", y: "<1 impact" },
  { name: "Underactive", color: "#6B7280", x: "<1 burn", y: "<1 impact" },
];

function quadrantOf(burn: number, impact: number) {
  if (burn >= 1 && impact >= 1) return "Stars";
  if (burn < 1 && impact >= 1) return "Hidden gems";
  if (burn >= 1 && impact < 1) return "Cash burners";
  return "Underactive";
}
const COLOR: Record<string, string> = {
  Stars: "#0F7B6C",
  "Hidden gems": "#0EA5E9",
  "Cash burners": "#DC2626",
  Underactive: "#94A3B8",
};

const KIND_LABEL: Record<string, string> = {
  burn_overrun: "Burn rate above expected",
  report_overdue: "Report overdue",
  allocations_on_hold: "Allocations on hold > 14d",
  enrollment_drop: "Enrollment dropping",
  attendance_drop: "Attendance dropping",
  field_log_frequency_drop: "Field log activity dropping",
};

export default function BurnVsImpact() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const [period, setPeriod] = useState<Period>("monthly");
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [projects, setProjects] = useState<Record<string, { id: string; name: string }>>({});
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const sb = supabase as any;
    const [{ data: snapRows }, { data: projRows }, { data: flagRows }] = await Promise.all([
      sb
        .from("burn_impact_snapshots")
        .select("*")
        .eq("organization_id", orgId)
        .eq("period", period)
        .order("period_start", { ascending: false }),
      sb
        .from("projects")
        .select("id,name")
        .eq("organization_id", orgId)
        .is("deleted_at", null),
      sb
        .from("project_anomaly_flags")
        .select("id,project_id,kind,severity,detail,detected_at")
        .eq("organization_id", orgId)
        .is("resolved_at", null),
    ]);
    // Keep latest snapshot per project
    const byProj = new Map<string, Snap>();
    (snapRows || []).forEach((s: Snap) => {
      if (!byProj.has(s.project_id)) byProj.set(s.project_id, s);
    });
    setSnaps(Array.from(byProj.values()));
    const pmap: Record<string, any> = {};
    (projRows || []).forEach((p: any) => (pmap[p.id] = p));
    setProjects(pmap);
    setFlags((flagRows || []) as Flag[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, period]);

  const runScan = async () => {
    if (!orgId) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("project-anomaly-scan", {
        body: { organization_id: orgId, period },
      });
      if (error) throw error;
      const res: any = data;
      toast.success(
        `Scan complete · ${res?.flags_raised ?? 0} new, ${res?.flags_resolved ?? 0} resolved, ${res?.snapshots_written ?? 0} snapshots`
      );
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const flagsByProject = useMemo(() => {
    const m: Record<string, Flag[]> = {};
    flags.forEach((f) => {
      (m[f.project_id] ||= []).push(f);
    });
    return m;
  }, [flags]);

  const data = snaps
    .filter((s) => projects[s.project_id])
    .map((s) => {
      const burn = Number(s.burn_rate ?? 0);
      const impact = Number(s.impact_velocity ?? 0);
      const q = quadrantOf(burn, impact);
      const f = flagsByProject[s.project_id] || [];
      return {
        x: burn,
        y: impact,
        z: Math.max(1, Number(s.base_volume ?? 0)),
        quadrant: q,
        color: COLOR[q],
        project_id: s.project_id,
        name: projects[s.project_id]?.name || "Project",
        snap: s,
        flagCount: f.length,
        critical: f.some((x) => x.severity === "critical"),
      };
    });

  const maxX = Math.max(2, ...data.map((d) => d.x), 1.6);
  const maxY = Math.max(2, ...data.map((d) => d.y), 1.6);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Intelligence
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Burn rate vs. impact velocity
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Each dot is a project. X = base-currency burn ÷ expected period budget.
            Y = indicator progress ÷ planned. Dot size = base-currency volume.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={runScan} disabled={scanning}>
            <Play className="h-4 w-4 mr-2" />
            {scanning ? "Scanning…" : "Run scan"}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matrix · {period}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : data.length === 0 ? (
            <div className="h-[420px] flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
              <p>No snapshots yet for this period.</p>
              <Button size="sm" onClick={runScan} disabled={scanning}>
                <Play className="h-4 w-4 mr-2" /> Run first scan
              </Button>
            </div>
          ) : (
            <div className="h-[460px] w-full">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Burn rate"
                    domain={[0, Math.ceil(maxX * 10) / 10]}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    label={{ value: "Burn rate (allocated / expected)", position: "insideBottom", offset: -16, fontSize: 12 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Impact velocity"
                    domain={[0, Math.ceil(maxY * 10) / 10]}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    label={{ value: "Impact velocity (actual / planned)", angle: -90, position: "insideLeft", fontSize: 12 }}
                  />
                  <ZAxis type="number" dataKey="z" range={[60, 600]} />
                  <ReferenceLine x={1} stroke="#94A3B8" strokeDasharray="4 4" />
                  <ReferenceLine y={1} stroke="#94A3B8" strokeDasharray="4 4" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d: any = payload[0].payload;
                      return (
                        <div className="rounded-md border bg-popover p-2 text-xs shadow">
                          <p className="font-medium">{d.name}</p>
                          <p>Quadrant: <strong>{d.quadrant}</strong></p>
                          <p>Burn: {(d.x * 100).toFixed(1)}%</p>
                          <p>Impact: {(d.y * 100).toFixed(1)}%</p>
                          <p>Volume: {Math.round(d.z).toLocaleString()}</p>
                          {d.flagCount > 0 && (
                            <p className="text-[var(--status-warning)] mt-1">
                              {d.flagCount} open flag{d.flagCount === 1 ? "" : "s"}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={data}
                    onClick={(p: any) =>
                      p?.project_id && navigate(`/projects/dashboard/${p.project_id}`)
                    }
                  >
                    {data.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.color}
                        stroke={d.critical ? "#DC2626" : d.flagCount > 0 ? "#F59E0B" : d.color}
                        strokeWidth={d.critical ? 3 : d.flagCount > 0 ? 2 : 1}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            {QUADRANTS.map((q) => (
              <div key={q.name} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: COLOR[q.name] }}
                />
                <span className="font-medium">{q.name}</span>
                <span className="text-muted-foreground">
                  {q.y} · {q.x}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--status-warning)]" /> Open anomaly flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open anomaly flags. </p>
          ) : (
            <ul className="divide-y">
              {flags.map((f) => (
                <li
                  key={f.id}
                  className="py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded"
                  onClick={() => navigate(`/projects/dashboard/${f.project_id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {projects[f.project_id]?.name || "Project"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {KIND_LABEL[f.kind] || f.kind} · {formatDistanceToNow(new Date(f.detected_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge
                    variant={
                      f.severity === "critical"
                        ? "destructive"
                        : f.severity === "warning"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {f.severity}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}