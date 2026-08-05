import {
  Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { CHART_PALETTE } from "@/lib/chartPalette";
import type { Distribution } from "@/hooks/useAnalyticsQuery";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

function DistributionCard({ d, accent }: { d: Distribution; accent: string }) {
  const total = d.series.reduce((s, r) => s + r.value, 0);
  const stacked = d.splitRows && d.splitKeys?.length
    ? d.splitRows.map((r) => {
        const row: Record<string, string | number> = { label: r.label };
        d.splitKeys!.forEach((k, i) => { row[k] = r.values[i] ?? 0; });
        return row;
      })
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="text-sm font-medium text-foreground">{d.label}</div>
        <div className="text-[12px] tabular-nums text-muted-foreground">
          n = {new Intl.NumberFormat().format(Math.round(total))}
        </div>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          {d.chart === "donut" ? (
            <PieChart>
              <Pie data={d.series} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
                {d.series.map((s, i) => (
                  <Cell key={s.key} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          ) : stacked ? (
            <BarChart data={stacked} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {d.splitKeys!.map((k, i) => (
                <Bar key={k} dataKey={k} stackId="a" fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </BarChart>
          ) : (
            <BarChart data={d.series} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill={accent} radius={[0, 3, 3, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DistributionPanel({ distributions, accent }: { distributions: Distribution[]; accent: string }) {
  const usable = distributions.filter((d) => d.series.some((s) => s.value > 0));
  if (!usable.length) return null;
  return (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Who is in this data</div>
      <div className="grid gap-4 md:grid-cols-2">
        {usable.map((d) => (
          <DistributionCard key={d.key} d={d} accent={accent} />
        ))}
      </div>
    </div>
  );
}
