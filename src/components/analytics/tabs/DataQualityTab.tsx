import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Database, AlertTriangle, FileWarning, Copy, ClockAlert, UserMinus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsKpiCard";
import { useDataQualityIntelligence } from "@/hooks/useAnalyticsTabsData";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

function barColor(pct: number) {
  if (pct >= 90) return "hsl(var(--primary))";
  if (pct >= 70) return "hsl(var(--accent))";
  return "hsl(var(--destructive))";
}

export default function DataQualityTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useDataQualityIntelligence(filters);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  const completeness = data?.overallCompleteness ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            Overall record completeness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums">{completeness.toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground">
              across {data?.total ?? 0} beneficiary records
            </span>
          </div>
          <Progress value={completeness} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyticsKpiCard
          label="Duplicate names"
          value={data?.duplicateGroupsCount ?? 0}
          sublabel={`${data?.duplicateCount ?? 0} affected records`}
          icon={Copy}
          tone="rose"
        />
        <AnalyticsKpiCard
          label="Orphan beneficiaries"
          value={data?.orphanBeneficiaries ?? 0}
          sublabel="Active, never enrolled"
          icon={UserMinus}
          tone="amber"
        />
        <AnalyticsKpiCard
          label="Stale records"
          value={data?.staleCount ?? 0}
          sublabel="No update in 180+ days"
          icon={ClockAlert}
          tone="violet"
        />
        <AnalyticsKpiCard
          label="Visit findings missing"
          value={data?.visitsMissingFindings ?? 0}
          icon={FileWarning}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Field completeness</CardTitle></CardHeader>
          <CardContent>
            {(data?.completenessByField?.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.completenessByField ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="field" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: any, _n, p: any) => [
                      `${Number(v).toFixed(1)}%`,
                      `Complete (missing: ${p.payload.missing})`,
                    ]}
                  />
                  <Bar dataKey="completePct" radius={[0, 6, 6, 0]}>
                    {(data?.completenessByField ?? []).map((row, i) => (
                      <Cell key={i} fill={barColor(row.completePct)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Quality issues to action
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <IssueRow
              label="Activities completed without an outcome"
              value={data?.activitiesMissingOutcome ?? 0}
            />
            <IssueRow
              label="Visitations needing follow-up but no date"
              value={data?.visitsMissingFollowupDate ?? 0}
            />
            <IssueRow
              label="Potential duplicate beneficiary groups"
              value={data?.duplicateGroupsCount ?? 0}
            />
            <IssueRow
              label="Orphan active beneficiaries"
              value={data?.orphanBeneficiaries ?? 0}
            />
            <IssueRow
              label="Stale beneficiary records"
              value={data?.staleCount ?? 0}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IssueRow({ label, value }: { label: string; value: number }) {
  const tone = value === 0 ? "text-emerald-600" : value < 5 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}