import { useMemo } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Target, Briefcase, Activity, Clock, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsKpiCard";
import { useProgrammeIntelligence } from "@/hooks/useAnalyticsTabsData";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export default function ProgrammeTab({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useProgrammeIntelligence(filters);

  const statusData = useMemo(
    () => Object.entries(data?.projectStatusMix ?? {}).map(([name, value]) => ({ name, value })),
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AnalyticsKpiCard label="Programmes" value={data?.totalPrograms ?? 0} icon={Target} tone="teal" />
        <AnalyticsKpiCard label="Projects" value={data?.totalProjects ?? 0} icon={Briefcase} tone="violet" />
        <AnalyticsKpiCard label="Active" value={data?.activePrograms ?? 0} icon={Activity} tone="teal" />
        <AnalyticsKpiCard label="Ending ≤60d" value={data?.endingSoon ?? 0} icon={Clock} tone={data?.endingSoon ? "amber" : "slate"} />
        <AnalyticsKpiCard
          label="Project Budget"
          value={`KES ${(data?.totalBudget ?? 0).toLocaleString()}`}
          icon={Wallet}
          tone="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Programme Performance</CardTitle></CardHeader>
          <CardContent>
            {(data?.programmeRows?.length ?? 0) === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No programmes match this filter.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Programme</TableHead>
                    <TableHead className="text-xs text-right">Beneficiaries</TableHead>
                    <TableHead className="text-xs text-right">Projects</TableHead>
                    <TableHead className="text-xs text-right">Annual Funding</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.programmeRows ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-medium">{row.name}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{row.beneficiaries.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{row.projectCount}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">KES {row.annualFunding.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">{row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Project Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">—</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {statusData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Beneficiaries per Programme</CardTitle></CardHeader>
        <CardContent>
          {(data?.programmeRows?.length ?? 0) === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">—</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.programmeRows ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="beneficiaries" radius={[6, 6, 0, 0]}>
                  {(data?.programmeRows ?? []).map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}