import { useMemo } from "react";
import {
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
import { Users, Accessibility, Heart, Home } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsKpiCard";
import { useDemographicsIntelligence } from "@/hooks/useAnalyticsTabsData";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--ring))",
];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export default function DemographicsTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useDemographicsIntelligence(filters);

  const religionData = useMemo(() => data?.religionMix ?? [], [data]);
  const incomeData = useMemo(() => data?.incomeMix ?? [], [data]);

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyticsKpiCard label="In scope" value={data?.total ?? 0} icon={Users} tone="teal" />
        <AnalyticsKpiCard label="With disability" value={data?.disabilityCount ?? 0} icon={Accessibility} tone="violet" />
        <AnalyticsKpiCard label="Special needs" value={data?.specialNeedsCount ?? 0} icon={Heart} tone="rose" />
        <AnalyticsKpiCard label="Avg household size" value={(data?.avgHouseholdSize ?? 0).toFixed(1)} icon={Home} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Age Distribution</CardTitle></CardHeader>
          <CardContent>
            {(data?.ageDistribution?.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.ageDistribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Age × Gender Cross-tab</CardTitle></CardHeader>
          <CardContent>
            {(data?.ageGenderCross?.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.ageGenderCross ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="male" stackId="g" fill="hsl(var(--primary))" />
                  <Bar dataKey="female" stackId="g" fill="hsl(var(--accent))" />
                  <Bar dataKey="other" stackId="g" fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Sub-counties</CardTitle></CardHeader>
          <CardContent>
            {(data?.subCountyTop?.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.subCountyTop ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Household Size</CardTitle></CardHeader>
          <CardContent>
            {(data?.householdDistribution?.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.householdDistribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Religion</CardTitle></CardHeader>
          <CardContent>
            {religionData.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">—</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={religionData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>
                    {religionData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Income Level</CardTitle></CardHeader>
          <CardContent>
            {incomeData.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">—</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={incomeData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>
                    {incomeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}