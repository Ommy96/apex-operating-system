import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DollarSign, TrendingDown, Users, Award, AlertTriangle, PieChart as PieIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsKpiCard";
import { useFundingIntelligence } from "@/hooks/useAnalyticsTabsData";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

function fmt(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${n.toLocaleString()}`;
}

export default function FundingTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useFundingIntelligence(filters);

  const burnTone = useMemo(() => {
    const r = data?.burnRate ?? 0;
    if (r > 100) return "rose" as const;
    if (r > 80) return "amber" as const;
    return "teal" as const;
  }, [data?.burnRate]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyticsKpiCard label="Total Income" value={fmt(data?.totalIncome ?? 0)} icon={DollarSign} tone="teal" />
        <AnalyticsKpiCard label="Total Expenses" value={fmt(data?.totalExpenses ?? 0)} icon={TrendingDown} tone="amber" />
        <AnalyticsKpiCard
          label="Burn Rate"
          value={`${(data?.burnRate ?? 0).toFixed(0)}%`}
          sublabel="expenses ÷ income"
          icon={TrendingDown}
          tone={burnTone}
        />
        <AnalyticsKpiCard label="Distinct Donors" value={data?.distinctDonors ?? 0} icon={Users} tone="violet" />
        <AnalyticsKpiCard label="Programme Donations" value={fmt(data?.programContribTotal ?? 0)} icon={DollarSign} tone="blue" />
        <AnalyticsKpiCard label="Sponsorships" value={fmt(data?.sponsorshipTotal ?? 0)} icon={Award} tone="teal" />
        <AnalyticsKpiCard
          label="Grant Coverage"
          value={`${(data?.sponsorshipCoveragePct ?? 0).toFixed(0)}%`}
          sublabel={`${fmt(data?.grantsReceived ?? 0)} of ${fmt(data?.grantsAwarded ?? 0)}`}
          icon={PieIcon}
          tone="violet"
        />
        <AnalyticsKpiCard
          label="Grants Expiring ≤60d"
          value={data?.grantsExpiring ?? 0}
          icon={AlertTriangle}
          tone={data?.grantsExpiring ? "rose" : "slate"}
        />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Income vs Expense Trend</CardTitle></CardHeader>
        <CardContent>
          {(data?.cashflowTrend?.length ?? 0) === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No financial activity in range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data?.cashflowTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : `${v}`)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top Donors</CardTitle></CardHeader>
        <CardContent>
          {(data?.topDonors?.length ?? 0) === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No donations recorded.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.topDonors ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : `${v}`)} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
                <Bar dataKey="total" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}