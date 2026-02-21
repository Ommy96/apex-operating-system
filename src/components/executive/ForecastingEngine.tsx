import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Users, DollarSign, Target, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { useMemo } from "react";

interface ForecastingEngineProps {
  programIntelligence: any;
  donorIntelligence: any;
  monthlyStaffTrends: any[];
  summary: any;
  isLoading: boolean;
}

function linearForecast(data: number[], periods: number): number[] {
  const n = data.length;
  if (n < 2) return Array(periods).fill(data[0] || 0);
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  data.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  return Array.from({ length: periods }, (_, i) => Math.max(0, Math.round(slope * (n + i) + intercept)));
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="h-4 w-4 text-success" />;
  if (value < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function ForecastingEngine({ programIntelligence, donorIntelligence, monthlyStaffTrends, summary, isLoading }: ForecastingEngineProps) {
  const forecasts = useMemo(() => {
    // Enrollment forecast
    const enrollmentTrends = programIntelligence?.enrollmentTrends || [];
    const enrollmentValues = enrollmentTrends.map((t: any) => t.newEnrollments);
    const enrollmentForecast = linearForecast(enrollmentValues, 3);
    const enrollmentData = [
      ...enrollmentTrends.map((t: any, i: number) => ({ month: t.monthShort, actual: t.newEnrollments, type: "actual" })),
      ...enrollmentForecast.map((v: number, i: number) => ({ month: `+${i + 1}mo`, forecast: v, type: "forecast" })),
    ];
    const enrollmentTrend = enrollmentValues.length >= 2
      ? enrollmentValues[enrollmentValues.length - 1] - enrollmentValues[enrollmentValues.length - 2]
      : 0;

    // Funding forecast
    const fundingTrends = donorIntelligence?.monthlyTrends || [];
    const fundingValues = fundingTrends.map((t: any) => t.amount);
    const fundingForecast = linearForecast(fundingValues, 3);
    const fundingData = [
      ...fundingTrends.map((t: any) => ({ month: t.month, actual: t.amount, type: "actual" })),
      ...fundingForecast.map((v: number, i: number) => ({ month: `+${i + 1}mo`, forecast: v, type: "forecast" })),
    ];
    const fundingTrend = fundingValues.length >= 2
      ? fundingValues[fundingValues.length - 1] - fundingValues[fundingValues.length - 2]
      : 0;

    // Staff activity forecast
    const staffValues = monthlyStaffTrends.map(t => t.totalReports);
    const staffForecast = linearForecast(staffValues, 3);
    const staffData = [
      ...monthlyStaffTrends.map(t => ({ month: t.monthShort, actual: t.totalReports, type: "actual" })),
      ...staffForecast.map((v, i) => ({ month: `+${i + 1}mo`, forecast: v, type: "forecast" })),
    ];
    const staffTrend = staffValues.length >= 2
      ? staffValues[staffValues.length - 1] - staffValues[staffValues.length - 2]
      : 0;

    return { enrollmentData, enrollmentForecast, enrollmentTrend, fundingData, fundingForecast, fundingTrend, staffData, staffForecast, staffTrend };
  }, [programIntelligence, donorIntelligence, monthlyStaffTrends]);

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>;
  }

  const cards = [
    {
      title: "Enrollment Forecast",
      icon: Users,
      data: forecasts.enrollmentData,
      trend: forecasts.enrollmentTrend,
      projected: forecasts.enrollmentForecast[0] || 0,
      label: "next month",
      color: "hsl(var(--accent))",
    },
    {
      title: "Funding Forecast (KES)",
      icon: DollarSign,
      data: forecasts.fundingData,
      trend: forecasts.fundingTrend,
      projected: forecasts.fundingForecast[0] || 0,
      label: "next month",
      color: "hsl(var(--success))",
      formatValue: (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString(),
    },
    {
      title: "Staff Activity Forecast",
      icon: BarChart3,
      data: forecasts.staffData,
      trend: forecasts.staffTrend,
      projected: forecasts.staffForecast[0] || 0,
      label: "next month",
      color: "hsl(var(--primary))",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(c => {
          const Icon = c.icon;
          const displayVal = c.formatValue ? c.formatValue(c.projected) : c.projected;
          return (
            <Card key={c.title} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{c.title}</span>
                  </div>
                  <TrendIcon value={c.trend} />
                </div>
                <p className="text-xl font-bold text-foreground">{displayVal}</p>
                <p className="text-xs text-muted-foreground">projected {c.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.slice(0, 2).map(c => (
          <Card key={c.title} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{c.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={c.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip />
                  <Area type="monotone" dataKey="actual" stroke={c.color} fill={c.color} fillOpacity={0.15} strokeWidth={2} name="Actual" connectNulls />
                  <Area type="monotone" dataKey="forecast" stroke={c.color} fill={c.color} fillOpacity={0.05} strokeWidth={2} strokeDasharray="6 3" name="Forecast" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff Activity Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Staff Activity Trend & Forecast</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={forecasts.staffData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="actual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="Actual" connectNulls />
              <Area type="monotone" dataKey="forecast" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.05} strokeWidth={2} strokeDasharray="6 3" name="Forecast" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
