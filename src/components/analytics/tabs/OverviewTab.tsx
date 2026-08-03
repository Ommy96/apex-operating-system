import {
  Users,
  HeartHandshake,
  Wallet,
  MapPin,
  Sparkles,
  CalendarPlus,
  AlertTriangle,
  ShieldAlert,
  HandCoins,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsKpiCard";
import { useOverviewMetrics } from "@/hooks/useOverviewMetrics";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import { cn } from "@/lib/utils";

interface OverviewTabProps {
  filters: AnalyticsFilters;
}

const PIE_COLOURS = [
  "hsl(173, 58%, 39%)", // teal-700
  "hsl(199, 89%, 48%)", // sky-500
  "hsl(262, 83%, 58%)", // violet-500
  "hsl(38, 92%, 50%)",  // amber-500
  "hsl(346, 87%, 43%)", // rose-700
  "hsl(160, 60%, 45%)", // emerald
];

const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-KE").format(n);

const formatKES = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Tab 1 — Overview.
 *
 * Headline KPIs, last-12-month growth, top programmes, funding mix and the
 * three highest-priority alert cards. Everything respects the global filters.
 */
export default function OverviewTab({ filters }: OverviewTabProps) {
  const { metrics, isLoading } = useOverviewMetrics(filters);
  const { kpis, growth, topProgrammes, fundingByProgramme, alerts } = metrics;

  const sponsorshipSubLabel =
    kpis.sponsoredCount + kpis.programmeFundedCount > 0
      ? `${formatNumber(kpis.sponsoredCount)} sponsored · ${formatNumber(kpis.programmeFundedCount)} programme-funded`
      : "No active sponsorships";

  const coverageTone =
    kpis.unsponsoredCoveragePct >= 80
      ? "teal"
      : kpis.unsponsoredCoveragePct >= 60
        ? "amber"
        : "rose";

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <AnalyticsKpiCard
          label="Total beneficiaries"
          value={formatNumber(kpis.totalBeneficiaries)}
          tone="teal"
          icon={Users}
          delta={kpis.totalBeneficiariesYoYDelta}
          deltaLabel="vs last year"
          isLoading={isLoading}
        />
        <AnalyticsKpiCard
          label="Sponsored"
          value={formatNumber(kpis.sponsoredCount + kpis.programmeFundedCount)}
          sublabel={sponsorshipSubLabel}
          tone="violet"
          icon={HeartHandshake}
          isLoading={isLoading}
        />
        <AnalyticsKpiCard
          label="Unsponsored"
          value={formatNumber(kpis.unsponsoredCount)}
          sublabel={
            kpis.unsponsoredCount > 0
              ? `${kpis.unsponsoredCoveragePct}% coverage achieved`
              : "Full coverage"
          }
          tone={coverageTone}
          icon={Sparkles}
          isLoading={isLoading}
        />
        <AnalyticsKpiCard
          label="Total donors"
          value={formatNumber(kpis.totalDonors)}
          tone="blue"
          icon={Wallet}
          isLoading={isLoading}
        />
        <AnalyticsKpiCard
          label="Counties covered"
          value={formatNumber(kpis.countiesCovered)}
          sublabel="out of 47 Kenyan counties"
          tone="slate"
          icon={MapPin}
          isLoading={isLoading}
        />
        <AnalyticsKpiCard
          label="Reach this month"
          value={formatNumber(kpis.reachThisMonth)}
          sublabel="new programme enrolments"
          tone="amber"
          icon={CalendarPlus}
          isLoading={isLoading}
        />
      </div>

      {/* Summary charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Beneficiary growth</CardTitle>
            <CardDescription className="text-xs">
              New registrations · last 12 months
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : growth.every((g) => g.value === 0) ? (
              <EmptyChartState message="No registrations recorded yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                    formatter={(v: number) => [formatNumber(v), "Beneficiaries"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(173, 58%, 39%)"
                    strokeWidth={2}
                    fill="url(#growthGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top programmes</CardTitle>
            <CardDescription className="text-xs">
              Beneficiaries enrolled per programme
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : topProgrammes.length === 0 ? (
              <EmptyChartState message="No programme enrolments yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProgrammes}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                    formatter={(v: number) => [formatNumber(v), "Beneficiaries"]}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {topProgrammes.map((_, i) => (
                      <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funding mix</CardTitle>
            <CardDescription className="text-xs">
              Active grant value by programme
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : fundingByProgramme.length === 0 ? (
              <EmptyChartState message="No grants recorded." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fundingByProgramme}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={42}
                    paddingAngle={2}
                  >
                    {fundingByProgramme.map((_, i) => (
                      <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                    formatter={(v: number, name) => [formatKES(Number(v)), name as string]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: 11 }}
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Highlight alerts row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <AlertCard
          tone="amber"
          icon={AlertTriangle}
          title={`${formatNumber(alerts.beneficiariesNotVisited90d)} beneficiaries`}
          body="have not been visited in 90+ days. Schedule a follow-up to maintain duty of care."
          isLoading={isLoading}
        />
        <AlertCard
          tone="rose"
          icon={ShieldAlert}
          title={`${formatNumber(alerts.grantsDueSoon)} grants`}
          body="end within the next 7 days. Confirm reporting deadlines and renewal pipeline."
          isLoading={isLoading}
        />
        <AlertCard
          tone={
            kpis.unsponsoredCoveragePct >= 80
              ? "teal"
              : kpis.unsponsoredCoveragePct >= 60
                ? "amber"
                : "rose"
          }
          icon={HandCoins}
          title={`${formatNumber(alerts.unsponsoredCount)} unsponsored beneficiaries`}
          body={`Sponsorship coverage stands at ${kpis.unsponsoredCoveragePct}% across enrolled beneficiaries.`}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

interface AlertCardProps {
  tone: "teal" | "amber" | "rose";
  icon: typeof AlertTriangle;
  title: string;
  body: string;
  isLoading?: boolean;
}

function AlertCard({ tone, icon: Icon, title, body, isLoading }: AlertCardProps) {
  const toneClasses = {
    teal: "border-success/70 bg-success/60 text-success",
    amber:
      "border-warning/70 bg-warning/60 text-warning",
    rose: "border-destructive/70 bg-destructive/60 text-destructive",
  };
  const iconClasses = {
    teal: "text-success",
    amber: "text-warning",
    rose: "text-destructive",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 shadow-sm",
        toneClasses[tone]
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", iconClasses[tone])} />
      <div className="min-w-0 space-y-1">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs opacity-90">{body}</p>
          </>
        )}
      </div>
    </div>
  );
}
