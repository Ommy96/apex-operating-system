import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  MapPin,
  Users,
  WifiOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLeadProjects } from "@/hooks/useLeadProjects";
import { useLeadWorkspaceData } from "@/hooks/useLeadWorkspaceData";
import { QuickFieldLog } from "@/components/field/QuickFieldLog";

const LS_KEY = "lead_workspace.last_project";
const CHECKED_KEY = "lead_workspace.checked";

function readChecked(projectId: string): Record<string, boolean> {
  try {
    const all = JSON.parse(localStorage.getItem(CHECKED_KEY) || "{}");
    return all[projectId] || {};
  } catch {
    return {};
  }
}
function writeChecked(projectId: string, map: Record<string, boolean>) {
  try {
    const all = JSON.parse(localStorage.getItem(CHECKED_KEY) || "{}");
    all[projectId] = map;
    localStorage.setItem(CHECKED_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export default function LeadWorkspace() {
  const navigate = useNavigate();
  const { projects, loading: projectsLoading } = useLeadProjects();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (projectId || !projects.length) return;
    const saved = localStorage.getItem(LS_KEY);
    const found = projects.find((p) => p.id === saved) || projects[0];
    setProjectId(found.id);
  }, [projects, projectId]);

  useEffect(() => {
    if (projectId) localStorage.setItem(LS_KEY, projectId);
  }, [projectId]);

  const data = useLeadWorkspaceData(projectId);
  const currentProject = projects.find((p) => p.id === projectId) || null;

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (projectId) setChecked(readChecked(projectId));
  }, [projectId]);
  const toggleChecked = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    if (projectId) writeChecked(projectId, next);
  };

  const headline = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>No projects assigned</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              You are not currently assigned as the lead or manager of any project.
              Ask an administrator to assign you to a project to see your workspace.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Go to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top bar */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{headline}</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            My project workspace
          </h1>
          {currentProject && (
            <p className="text-sm text-muted-foreground mt-1">
              {currentProject.project_code ? `${currentProject.project_code} · ` : ""}
              {currentProject.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="h-3 w-3" /> Offline
            </Badge>
          )}
          {projects.length > 1 && (
            <Select
              value={projectId ?? undefined}
              onValueChange={(v) => setProjectId(v)}
            >
              <SelectTrigger className="w-full sm:w-[260px]">
                <SelectValue placeholder="Switch project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_code ? `${p.project_code} · ` : ""}
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            onClick={() => projectId && navigate(`/projects/dashboard/${projectId}`)}
          >
            Open project
          </Button>
        </div>
      </header>

      {/* TODAY + ATTENTION grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TODAY */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Today
            </CardTitle>
            {data.loadedFromCache && (
              <Badge variant="outline" className="text-xs">Cached</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {data.loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <>
                <Section
                  label="Visits scheduled today"
                  empty="No visits scheduled today."
                  items={data.visitsToday.map((v: any) => ({
                    id: v.id,
                    primary: v.visit_type || "Visit",
                    secondary: `${v.location || ""} ${v.staff_name ? "· " + v.staff_name : ""}`,
                  }))}
                />
                <Section
                  label="Activities scheduled today"
                  empty="No activities scheduled today."
                  items={data.activitiesToday.map((a: any) => ({
                    id: a.id,
                    primary: a.name,
                    secondary: `${a.type || ""} ${a.location ? "· " + a.location : ""}`,
                    onClick: () => navigate(`/activities/${a.id}`),
                  }))}
                />
                <Section
                  label="Reports due this week"
                  empty="No reports due this week."
                  items={data.reportsDueThisWeek.map((r: any) => ({
                    id: r.id,
                    primary: `${r.period_start?.slice(0, 10)} → ${r.period_end?.slice(0, 10)}`,
                    secondary: `Status: ${r.status}`,
                    onClick: () => navigate(`/projects/${projectId}/reports`),
                  }))}
                />
                <Section
                  label="Allocations pending review"
                  empty="No allocations awaiting review."
                  items={data.pendingAllocations.slice(0, 5).map((a: any) => ({
                    id: a.id,
                    primary: `${a.amount_native} ${a.native_currency}`,
                    secondary: `${a.scope || "allocation"} · ${a.status}`,
                    onClick: () => navigate(`/funding/allocation-engine`),
                  }))}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* ATTENTION */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <>
                <Section
                  label="High-risk beneficiaries"
                  empty="No beneficiaries currently flagged high risk."
                  items={data.highRiskBeneficiaries.slice(0, 6).map((r: any) => ({
                    id: r.beneficiary_id,
                    primary:
                      r.beneficiary?.display_name ||
                      `${r.beneficiary?.first_name ?? ""} ${r.beneficiary?.last_name ?? ""}`.trim() ||
                      "Beneficiary",
                    secondary: `Risk: ${r.overall_risk_level}`,
                    onClick: () => navigate(`/beneficiaries/${r.beneficiary_id}`),
                  }))}
                />
                <Section
                  label="No visit > 60 days"
                  empty="All beneficiaries visited within 60 days."
                  items={data.staleBeneficiaries.slice(0, 6).map((b: any) => ({
                    id: b.id,
                    primary:
                      b.display_name ||
                      `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim() ||
                      "Beneficiary",
                    secondary: "No visit in the last 60 days",
                    onClick: () => navigate(`/beneficiaries/${b.id}`),
                  }))}
                />
                <Section
                  label="Allocations held > 7 days"
                  empty="No allocations stuck on hold."
                  items={data.heldAllocations.slice(0, 6).map((a: any) => ({
                    id: a.id,
                    primary: `${a.amount_native} ${a.native_currency}`,
                    secondary: `Held since ${a.allocated_at ? formatDistanceToNow(new Date(a.allocated_at), { addSuffix: true }) : ""}`,
                    onClick: () => navigate(`/funding/allocation-engine`),
                  }))}
                />
                <Section
                  label="Field logs missing follow-up"
                  empty="No outstanding field logs."
                  items={data.fieldLogsMissingFollowup.slice(0, 6).map((f: any) => ({
                    id: f.id,
                    primary: f.title,
                    secondary: `${f.category} · ${formatDistanceToNow(new Date(f.logged_at), { addSuffix: true })}`,
                  }))}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* WORK QUEUE + MY TEAM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Work queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.loading ? (
              <Skeleton className="h-16 w-full" />
            ) : data.workQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> All caught up.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.workQueue.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={!!checked[item.id]}
                      onCheckedChange={() => toggleChecked(item.id)}
                    />
                    <button
                      type="button"
                      onClick={() => item.href && navigate(item.href)}
                      className={`flex-1 text-left text-sm ${checked[item.id] ? "line-through text-muted-foreground" : ""}`}
                    >
                      {item.label}
                    </button>
                    <Badge variant="outline">{item.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> My team
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.loading ? (
              <Skeleton className="h-20 w-full" />
            ) : data.teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No field staff assigned to this project yet.
              </p>
            ) : (
              <ul className="divide-y">
                {data.teamMembers.map((m) => (
                  <li key={m.user_id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.full_name || m.email || "Team member"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.role_on_project || "Field staff"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={m.recent_log_count ? "default" : "outline"}>
                        {m.recent_log_count} log{m.recent_log_count === 1 ? "" : "s"} / 7d
                      </Badge>
                      {m.last_log_at && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Last {formatDistanceToNow(new Date(m.last_log_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick log */}
      <div>
        <h2 className="text-sm font-medium mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Quick field log
          <span className="text-xs text-muted-foreground font-normal">
            (saved offline, syncs automatically)
          </span>
        </h2>
        <QuickFieldLog />
      </div>
    </div>
  );
}

type SectionItem = {
  id: string;
  primary: string;
  secondary?: string;
  onClick?: () => void;
};

function Section({
  label,
  items,
  empty,
}: {
  label: string;
  items: SectionItem[];
  empty: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <FileWarning className="h-3.5 w-3.5" /> {empty}
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={it.onClick}
                disabled={!it.onClick}
                className={`w-full text-left p-2 rounded-md border bg-card ${it.onClick ? "hover:bg-muted/40 cursor-pointer" : "cursor-default"}`}
              >
                <p className="text-sm font-medium truncate">{it.primary}</p>
                {it.secondary && (
                  <p className="text-xs text-muted-foreground truncate">{it.secondary}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}