import { useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ShieldAlert, AlertTriangle, ShieldCheck, Activity, Gauge, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsKpiCard";
import { useRiskIntelligence } from "@/hooks/useAnalyticsTabsData";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";

const PALETTE = [
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--ring))",
];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const levelTone: Record<string, "teal" | "amber" | "rose" | "violet"> = {
  low: "teal",
  medium: "amber",
  high: "rose",
  critical: "rose",
  unknown: "violet",
};

export default function RiskTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useRiskIntelligence(filters);

  const vulnData = useMemo(
    () => Object.entries(data?.vulnerabilityMix ?? {}).map(([name, value]) => ({ name, value })),
    [data],
  );

  const levelData = useMemo(
    () => [
      { name: "High / Critical", value: data?.high ?? 0 },
      { name: "Medium", value: data?.medium ?? 0 },
      { name: "Low", value: data?.low ?? 0 },
    ],
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <AnalyticsKpiCard
          label="Assessed"
          value={data?.assessed ?? 0}
          icon={ShieldCheck}
          tone="teal"
        />
        <AnalyticsKpiCard
          label="Unassessed"
          value={data?.unassessed ?? 0}
          icon={Users}
          tone="amber"
        />
        <AnalyticsKpiCard
          label="Coverage"
          value={`${(data?.coveragePct ?? 0).toFixed(1)}%`}
          icon={Gauge}
          tone="violet"
        />
        <AnalyticsKpiCard
          label="High / critical"
          value={data?.high ?? 0}
          icon={ShieldAlert}
          tone="rose"
        />
        <AnalyticsKpiCard
          label="Medium"
          value={data?.medium ?? 0}
          icon={AlertTriangle}
          tone="amber"
        />
        <AnalyticsKpiCard
          label="Avg dropout score"
          value={(data?.avgDropout ?? 0).toFixed(1)}
          icon={Activity}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Risk Level Mix</CardTitle></CardHeader>
          <CardContent>
            {(data?.assessed ?? 0) === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">No assessments.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={levelData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {levelData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Vulnerability Tier</CardTitle></CardHeader>
          <CardContent>
            {vulnData.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">—</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={vulnData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {vulnData.map((_, i) => <Cell key={i} fill={PALETTE[(i + 1) % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Risk Profile (avg)</CardTitle></CardHeader>
          <CardContent>
            {(data?.assessed ?? 0) === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">—</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={data?.radarMetrics ?? []}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} angle={30} domain={[0, 100]} />
                  <Radar
                    dataKey="value"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.35}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top At-Risk Beneficiaries</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.topAtRisk?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No risk assessments yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">County</th>
                    <th className="py-2 pr-3 font-medium">Level</th>
                    <th className="py-2 pr-3 font-medium text-right">Dropout</th>
                    <th className="py-2 pr-3 font-medium text-right">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.topAtRisk.map((b) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{b.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{b.county}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="capitalize text-xs">
                          {b.level}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{b.dropout.toFixed(1)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{b.engagement.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
