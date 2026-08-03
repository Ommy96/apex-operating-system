import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Users, UserCheck, UserX, UserPlus, AlertTriangle, Heart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsKpiCard";
import { useBeneficiaryIntelligence } from "@/hooks/useAnalyticsTabsData";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import AcademicPerformanceSection from "@/components/analytics/AcademicPerformanceSection";
import { CHART_PALETTE } from "@/lib/chartPalette";

const PALETTE = CHART_PALETTE;

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export default function BeneficiaryTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useBeneficiaryIntelligence(filters);

  const genderData = useMemo(
    () => Object.entries(data?.genderMix ?? {}).map(([name, value]) => ({ name, value })),
    [data],
  );
  const vulnData = useMemo(
    () => Object.entries(data?.vulnerabilityMix ?? {}).map(([name, value]) => ({ name, value })),
    [data],
  );
  const typeData = useMemo(
    () => Object.entries(data?.typeMix ?? {}).map(([name, value]) => ({ name, value })),
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <AnalyticsKpiCard label="Total" value={data?.total ?? 0} icon={Users} tone="teal" />
        <AnalyticsKpiCard label="Active" value={data?.active ?? 0} icon={UserCheck} tone="teal" />
        <AnalyticsKpiCard label="Inactive" value={data?.inactive ?? 0} icon={UserX} tone="amber" />
        <AnalyticsKpiCard label="Exited" value={data?.exited ?? 0} icon={UserX} tone="rose" />
        <AnalyticsKpiCard label="New (in range)" value={data?.newInRange ?? 0} icon={UserPlus} tone="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Enrolment Trend</CardTitle></CardHeader>
          <CardContent>
            {(data?.enrolmentTrend?.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data?.enrolmentTrend ?? []}>
                  <defs>
                    <linearGradient id="benFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#benFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Counties</CardTitle></CardHeader>
          <CardContent>
            {(data?.countyMix?.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No location data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.countyMix ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="county" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {(data?.countyMix ?? []).map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Gender", data: genderData, icon: Users },
          { title: "Vulnerability Tier", data: vulnData, icon: AlertTriangle },
          { title: "Beneficiary Type", data: typeData, icon: Heart },
        ].map(({ title, data: chartData }) => (
          <Card key={title}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">—</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={75} paddingAngle={2}>
                      {chartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AcademicPerformanceSection />
    </div>
  );
}