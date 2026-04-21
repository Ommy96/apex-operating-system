import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Users, Heart, Calendar, MapPin, TrendingUp, AlertTriangle, Award, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsKpiCard";
import { useHRAnalytics } from "@/hooks/useHRAnalytics";

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--ring))",
];

function ChartSkeleton() {
  return <Skeleton className="h-[280px] w-full" />;
}

export function HRAnalytics() {
  const { data, isLoading } = useHRAnalytics();

  const roleData = useMemo(
    () =>
      Object.entries(data?.roleDist ?? {}).map(([role, count]) => ({
        role: role.replace(/_/g, " "),
        count,
      })),
    [data],
  );

  const leaveData = useMemo(
    () =>
      Object.entries(data?.leaveByType ?? {}).map(([name, v]) => ({
        name,
        days: v.days,
        count: v.count,
      })),
    [data],
  );

  const contractData = useMemo(
    () =>
      Object.entries(data?.contractsByStatus ?? {}).map(([name, value]) => ({
        name,
        value,
      })),
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyticsKpiCard label="Total Staff" value={data?.totalStaff ?? 0} icon={Users} />
        <AnalyticsKpiCard
          label="Active Volunteers"
          value={data?.activeVolunteers ?? 0}
          sub={`${data?.totalVolunteers ?? 0} total`}
          icon={Heart}
        />
        <AnalyticsKpiCard
          label="Pending Leave"
          value={data?.pendingLeave ?? 0}
          sub={`${data?.approvedLeaveDays ?? 0} days approved`}
          icon={Calendar}
        />
        <AnalyticsKpiCard
          label="Field Staff (30d)"
          value={data?.activeFieldStaff ?? 0}
          icon={MapPin}
        />
        <AnalyticsKpiCard
          label="Volunteer Retention"
          value={`${(data?.retentionRate ?? 0).toFixed(0)}%`}
          sub="≥6 months active"
          icon={TrendingUp}
        />
        <AnalyticsKpiCard
          label="Avg Contract Score"
          value={(data?.avgContractScore ?? 0).toFixed(1)}
          sub="out of 100"
          icon={Award}
        />
        <AnalyticsKpiCard
          label="Overdue Tasks"
          value={data?.overdueTasks ?? 0}
          icon={AlertTriangle}
          tone={data?.overdueTasks ? "warning" : "default"}
        />
        <AnalyticsKpiCard
          label="Volunteer Hours"
          value={(data?.totalVolunteerHours ?? 0).toLocaleString()}
          sub="lifetime"
          icon={Clock}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Staff by Role</CardTitle>
          </CardHeader>
          <CardContent>
            {roleData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No staff records.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={roleData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="role" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Volunteer Hours (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data?.volunteerHoursTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leave Days by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {leaveData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No leave requests.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={leaveData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="days" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance Contracts Status</CardTitle>
          </CardHeader>
          <CardContent>
            {contractData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No contracts yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={contractData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {contractData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Task Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data?.tasksByStatus ?? {}).map(([status, count]) => (
              <Badge key={status} variant="secondary" className="text-xs capitalize">
                {status.replace(/_/g, " ")}: {count}
              </Badge>
            ))}
            {Object.keys(data?.tasksByStatus ?? {}).length === 0 && (
              <p className="text-sm text-muted-foreground">No tasks recorded.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}