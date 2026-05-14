import { Link } from "react-router-dom";
import { Users, BarChart3, Activity, AlertTriangle, ClipboardList, Target, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMEHub, computeDataQualityScore } from "@/hooks/useMEHub";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { cn } from "@/lib/utils";

export default function MEHub() {
  const { data, isLoading } = useMEHub();
  const score = computeDataQualityScore(data);
  const scoreColor = score >= 80 ? "text-teal-600" : score >= 60 ? "text-amber-600" : "text-rose-600";
  const scoreRing = score >= 80 ? "stroke-teal-500" : score >= 60 ? "stroke-amber-500" : "stroke-rose-500";

  return (
    <div className="space-y-6 p-6">
      <PageHeroHeader
        title="Monitoring & Evaluation"
        description="Evidence-based programme management"
        icon={Activity}
      />

      {/* Two primary anchors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnchorCard
          to="/beneficiaries"
          icon={Users}
          title="Beneficiary intelligence"
          subtitle="Profiles, case histories, visit logs, outcomes by individual"
          stats={[
            { label: "beneficiaries", value: data?.totalBeneficiaries },
            { label: "cases open", value: data?.activeCases },
            { label: "visits this month", value: data?.visitsThisMonth },
          ]}
          ctaLabel="Open beneficiary M&E"
          accent="teal"
          loading={isLoading}
        />
        <AnchorCard
          to="/programs-management"
          icon={BarChart3}
          title="Project & programme intelligence"
          subtitle="Indicators, logframes, activity progress, outcomes by programme"
          stats={[
            { label: "active programmes", value: data?.activePrograms },
            { label: "on track", value: data?.indicatorsOnTrack },
            { label: "data due this week", value: data?.dataDueThisWeek },
          ]}
          ctaLabel="Open project M&E"
          accent="blue"
          loading={isLoading}
        />
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Indicator health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-teal-600" /> Indicator health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatBox value={data?.indicatorsOnTrack ?? 0} label="On track" color="teal" />
              <StatBox value={data?.indicatorsAtRisk ?? 0} label="At risk" color="amber" />
              <StatBox value={data?.indicatorsOffTrack ?? 0} label="Off track" color="rose" />
            </div>
            <div className="space-y-2 pt-2 border-t">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : data?.topOffTrackIndicators.length ? (
                data.topOffTrackIndicators.map((ind) => (
                  <Link
                    key={ind.id}
                    to={`/indicators/${ind.id}`}
                    className="flex items-center justify-between text-sm hover:bg-muted/50 rounded px-2 py-1.5 -mx-2"
                  >
                    <span className="truncate flex-1">{ind.name}</span>
                    <span className="text-rose-600 font-medium tabular-nums">{Math.round(ind.percent)}%</span>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No off-track indicators.</p>
              )}
            </div>
            <Button asChild variant="ghost" size="sm" className="w-full justify-between">
              <Link to="/indicators">Manage indicators <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* Data collection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-blue-600" /> Data collection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatBox value={data?.collectionsOverdue ?? 0} label="Overdue" color="rose" />
              <StatBox value={data?.dataDueThisWeek ?? 0} label="Due this week" color="amber" />
              <StatBox value={data?.collectionsCollectedThisWeek ?? 0} label="Collected" color="teal" />
            </div>
            <div className="space-y-2 pt-2 border-t">
              {data?.overdueCollections.length ? (
                data.overdueCollections.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{c.indicator_name ?? "Indicator"}</span>
                    <span className="text-rose-600 tabular-nums">{c.days_overdue}d late</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">All collections on schedule.</p>
              )}
            </div>
            <Button asChild variant="ghost" size="sm" className="w-full justify-between">
              <Link to="/programs-management?tab=calendar">View schedule <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* Cases */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-purple-600" /> Case management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatBox value={data?.openCases ?? 0} label="Open" color="blue" />
              <StatBox value={data?.highPriorityCases ?? 0} label="High priority" color="rose" />
              <StatBox value={data?.overdueFollowUps ?? 0} label="Overdue" color="amber" />
            </div>
            <div className="space-y-2 pt-2 border-t min-h-[60px]">
              <p className="text-xs text-muted-foreground italic">Full case management UI ships in the next release.</p>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-between" disabled>
              View cases <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Data quality score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Data quality score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="60" strokeWidth="12" className="fill-none stroke-muted" />
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  strokeWidth="12"
                  className={cn("fill-none transition-all", scoreRing)}
                  strokeDasharray={`${(score / 100) * 377} 377`}
                  strokeDashoffset="0"
                  transform="rotate(-90 70 70)"
                  strokeLinecap="round"
                />
              </svg>
              <div className={cn("absolute inset-0 flex items-center justify-center text-3xl font-bold", scoreColor)}>
                {score}%
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Composite quality score</p>
              <p className="text-sm text-muted-foreground">
                Calculated from: % records without quality flags (40%), % collections on schedule (30%),
                % activities with beneficiary linkage (30%).
              </p>
              {data && data.dataQualityFlagsUnresolved > 0 && (
                <p className="text-sm text-rose-600">{data.dataQualityFlagsUnresolved} unresolved issue{data.dataQualityFlagsUnresolved === 1 ? "" : "s"} need attention.</p>
              )}
              {data && data.activitiesWithoutBeneficiaries > 0 && (
                <p className="text-sm text-amber-700">{data.activitiesWithoutBeneficiaries} of {data.totalActivitiesRecent} recent activities have no beneficiary linkage.</p>
              )}
              <div className="flex gap-2 pt-2">
                <Link to="/me/data-quality" className="text-xs font-medium text-primary hover:underline">Open data quality →</Link>
                <Link to="/me/reports" className="text-xs font-medium text-primary hover:underline">Assemble report →</Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: "teal" | "amber" | "rose" | "blue" }) {
  const colorClass = {
    teal: "text-teal-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    blue: "text-blue-600",
  }[color];
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className={cn("text-2xl font-bold tabular-nums", colorClass)}>{value}</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}

interface AnchorCardProps {
  to: string;
  icon: any;
  title: string;
  subtitle: string;
  stats: Array<{ label: string; value: number | undefined }>;
  ctaLabel: string;
  accent: "teal" | "blue";
  loading: boolean;
}
function AnchorCard({ to, icon: Icon, title, subtitle, stats, ctaLabel, accent, loading }: AnchorCardProps) {
  const borderClass = accent === "teal" ? "border-l-teal-500" : "border-l-blue-500";
  const iconBg = accent === "teal" ? "bg-teal-50 text-teal-600" : "bg-blue-50 text-blue-600";
  return (
    <Card className={cn("border-l-4 hover:shadow-md transition-shadow", borderClass)}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm pl-1">
          {stats.map((s, i) => (
            <div key={i} className="flex items-baseline gap-1">
              {loading ? (
                <Skeleton className="h-5 w-8 inline-block" />
              ) : (
                <span className="font-bold tabular-nums">{s.value ?? 0}</span>
              )}
              <span className="text-muted-foreground text-xs">{s.label}</span>
              {i < stats.length - 1 && <span className="text-muted-foreground/40 ml-2">·</span>}
            </div>
          ))}
        </div>
        <Button asChild className="w-full" variant="outline">
          <Link to={to}>{ctaLabel} <ArrowRight className="h-4 w-4 ml-1" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}