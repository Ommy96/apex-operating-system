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
import { Home, UserCheck, AlertTriangle, ClipboardCheck, MapPin, CalendarClock } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsKpiCard";
import { useVisitationIntelligence } from "@/hooks/useAnalyticsTabsData";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";

const PALETTE = [
  "hsl(173, 58%, 39%)",
  "hsl(199, 89%, 48%)",
  "hsl(262, 83%, 58%)",
  "hsl(38, 92%, 50%)",
  "hsl(346, 87%, 53%)",
  "hsl(160, 60%, 45%)",
];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export default function VisitationTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useVisitationIntelligence(filters);

  const typeData = useMemo(
    () => Object.entries(data?.typeMix ?? {}).map(([name, value]) => ({ name, value })),
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
        <AnalyticsKpiCard label="Total visits" value={data?.totalVisits ?? 0} icon={Home} tone="teal" />
        <AnalyticsKpiCard label="Beneficiaries reached" value={data?.uniqueBeneficiariesVisited ?? 0} icon={UserCheck} tone="teal" />
        <AnalyticsKpiCard
          label="Coverage"
          value={`${(data?.coveragePct ?? 0).toFixed(1)}%`}
          icon={ClipboardCheck}
          tone="violet"
        />
        <AnalyticsKpiCard label="Follow-ups due" value={data?.followUpsRequired ?? 0} icon={CalendarClock} tone="amber" />
        <AnalyticsKpiCard label="Overdue follow-ups" value={data?.followUpsOverdue ?? 0} icon={AlertTriangle} tone="rose" />
        <AnalyticsKpiCard label="No visit (active)" value={data?.neverVisited ?? 0} icon={MapPin} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Visit Volume Trend</CardTitle></CardHeader>
          <CardContent>
            {(data?.visitTrend?.length ?? 0) === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No visits in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data?.visitTrend ?? []}>
                  <defs>
                    <linearGradient id="visFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#visFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Visit Type Mix</CardTitle></CardHeader>
          <CardContent>
            {typeData.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">—</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={75} paddingAngle={2}>
                    {typeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Field Staff</CardTitle></CardHeader>
          <CardContent>
            {(data?.topStaff?.length ?? 0) === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No staff activity.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data?.topStaff ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {(data?.topStaff ?? []).map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming Follow-ups (14 days)</CardTitle></CardHeader>
          <CardContent>
            {(data?.upcomingFollowUps?.length ?? 0) === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No follow-ups scheduled.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data!.upcomingFollowUps.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{v.staff_name ?? "Unassigned"}</span>
                      <span className="text-xs text-muted-foreground">
                        {v.location ?? "—"} · {v.visit_type ?? "visit"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {v.follow_up_date ? format(new Date(v.follow_up_date), "dd MMM") : "—"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
