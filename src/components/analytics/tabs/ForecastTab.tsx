import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Users, DollarSign, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsKpiCard";
import { useForecastIntelligence } from "@/hooks/useAnalyticsTabsData";
import { useCurrency } from "@/hooks/useCurrency";
import { useOrganization } from "@/hooks/useOrganization";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toString();
}

export default function ForecastTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useForecastIntelligence(filters);
  const { currentOrganization } = useOrganization();
  const baseCurrency = (currentOrganization as any)?.base_currency ?? "KES";
  const { formatAmount } = useCurrency(baseCurrency);
  const format = (v: number) => formatAmount(v, baseCurrency);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  const series = [
    {
      title: "Beneficiary growth (next 6 months)",
      data: data?.beneficiaryGrowthSeries ?? [],
      yKey: "count",
      stroke: "hsl(var(--primary))",
      formatter: (v: number) => v.toString(),
    },
    {
      title: "Income trajectory (next 6 months)",
      data: data?.incomeSeries ?? [],
      yKey: "amount",
      stroke: "hsl(var(--accent))",
      formatter: fmt,
    },
    {
      title: "Expense trajectory (next 6 months)",
      data: data?.expenseSeries ?? [],
      yKey: "amount",
      stroke: "hsl(var(--destructive))",
      formatter: fmt,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <AnalyticsKpiCard
          label="Avg monthly enrolment growth"
          value={`${(data?.beneficiaryAvgGrowth ?? 0).toFixed(1)}%`}
          icon={Users}
          tone="teal"
          sublabel={`Projected new (6mo): ${data?.projectedBeneficiaries6Mo ?? 0}`}
        />
        <AnalyticsKpiCard
          label="Avg income growth"
          value={`${(data?.incomeAvgGrowth ?? 0).toFixed(1)}%`}
          icon={DollarSign}
          tone={data && data.incomeAvgGrowth >= 0 ? "teal" : "rose"}
          sublabel={`Projected (6mo): ${format(data?.projectedIncome6Mo ?? 0)}`}
        />
        <AnalyticsKpiCard
          label="Avg expense growth"
          value={`${(data?.expenseAvgGrowth ?? 0).toFixed(1)}%`}
          icon={Wallet}
          tone="amber"
          invertDelta
          sublabel={`Projected (6mo): ${format(data?.projectedExpense6Mo ?? 0)}`}
        />
      </div>

      {series.map((s) => (
        <Card key={s.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              {s.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {s.data.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Not enough history to project.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={s.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={s.formatter} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => (v == null ? "—" : s.formatter(Number(v)))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke={s.stroke}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Actual"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke={s.stroke}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    name="Forecast"
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      ))}

      <p className="text-xs text-muted-foreground italic">
        Forecasts use linear regression on the last 12 months of activity. Treat as a directional indicator, not a guarantee.
      </p>
    </div>
  );
}