import type { AnalyticsStats } from "@/hooks/useAnalyticsQuery";

const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);

export function StatsStrip({ stats }: { stats?: AnalyticsStats }) {
  if (!stats || !stats.n) return null;
  const items: Array<{ label: string; value: string }> = [
    { label: "Data points", value: fmt(stats.n) },
    { label: "Total", value: fmt(stats.total) },
    { label: "Mean", value: fmt(stats.mean) },
    { label: "Median", value: fmt(stats.median) },
    { label: "Lowest", value: stats.min ? `${stats.min.label} · ${fmt(stats.min.value)}` : "—" },
    { label: "Highest", value: stats.max ? `${stats.max.label} · ${fmt(stats.max.value)}` : "—" },
    { label: "Most common", value: stats.modal ? `${stats.modal.label} · ${fmt(stats.modal.value)}` : "—" },
    {
      label: "Change",
      value: stats.pctChange === null ? "—" : `${stats.pctChange > 0 ? "+" : ""}${fmt(stats.pctChange)}%`,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="bg-card px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{i.label}</div>
          <div className="mt-0.5 truncate text-sm font-medium tabular-nums text-foreground">{i.value}</div>
        </div>
      ))}
    </div>
  );
}
