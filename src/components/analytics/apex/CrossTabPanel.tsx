import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CHART_PALETTE } from "@/lib/chartPalette";
import type { MatrixResult } from "@/hooks/useAnalyticsQuery";
import { cn } from "@/lib/utils";

type ViewMode = "grouped" | "stacked" | "heatmap" | "multiline" | "table";

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

export function CrossTabPanel({
  matrix,
  dimALabel,
  dimBLabel,
  onDrillDown,
}: {
  matrix: MatrixResult;
  dimALabel: string;
  dimBLabel: string;
  onDrillDown?: (dimension: string, value: string) => void;
}) {
  const [view, setView] = useState<ViewMode>(matrix.suggested);

  const data = useMemo(
    () =>
      matrix.rows.map((r, i) => {
        const row: Record<string, string | number> = { label: r.label, key: r.key };
        matrix.cols.forEach((c, j) => { row[c.label] = matrix.cells[i]?.[j] ?? 0; });
        return row;
      }),
    [matrix]
  );

  const max = useMemo(() => Math.max(1, ...matrix.cells.flat()), [matrix]);
  const rowTotals = matrix.cells.map((r) => r.reduce((s, v) => s + v, 0));
  const colTotals = matrix.cols.map((_, j) => matrix.cells.reduce((s, r) => s + (r[j] ?? 0), 0));

  const modes: ViewMode[] = ["grouped", "stacked", "multiline", "heatmap", "table"];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-foreground">
            {dimALabel} × {dimBLabel}
          </div>
          <div className="text-[12px] text-muted-foreground">Cross-tabulation of the current metric</div>
        </div>
        <div className="inline-flex items-center rounded-full border border-border bg-background p-0.5">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setView(m)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[12px] capitalize transition-colors",
                view === m ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {view === "table" || view === "heatmap" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card px-2 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {dimALabel}
                </th>
                {matrix.cols.map((c) => (
                  <th key={c.key} className="px-2 py-1.5 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {c.label}
                  </th>
                ))}
                <th className="px-2 py-1.5 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((r, i) => (
                <tr key={r.key} className="border-t border-border/60">
                  <td
                    className={cn(
                      "sticky left-0 z-10 bg-card px-2 py-1.5 text-foreground",
                      onDrillDown && "cursor-pointer hover:underline"
                    )}
                    onClick={() => onDrillDown?.(matrix.dimA, r.key)}
                  >
                    {r.label}
                  </td>
                  {matrix.cols.map((c, j) => {
                    const v = matrix.cells[i]?.[j] ?? 0;
                    const intensity = view === "heatmap" ? v / max : 0;
                    return (
                      <td
                        key={c.key}
                        className="px-2 py-1.5 text-right tabular-nums text-foreground"
                        style={
                          view === "heatmap"
                            ? { backgroundColor: `hsl(var(--primary) / ${(intensity * 0.55).toFixed(3)})` }
                            : undefined
                        }
                      >
                        {v ? nf.format(v) : "–"}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-right font-medium tabular-nums text-foreground">{nf.format(rowTotals[i] ?? 0)}</td>
                </tr>
              ))}
              <tr className="border-t border-border">
                <td className="sticky left-0 z-10 bg-card px-2 py-1.5 text-[12px] font-medium text-muted-foreground">Total</td>
                {colTotals.map((t, j) => (
                  <td key={j} className="px-2 py-1.5 text-right font-medium tabular-nums text-foreground">{nf.format(t)}</td>
                ))}
                <td className="px-2 py-1.5 text-right font-medium tabular-nums text-foreground">
                  {nf.format(rowTotals.reduce((s, v) => s + v, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[300px] md:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            {view === "multiline" ? (
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {matrix.cols.map((c, idx) => (
                  <Line
                    key={c.key}
                    type="monotone"
                    dataKey={c.label}
                    stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={0} angle={matrix.rows.length > 6 ? -25 : 0} textAnchor={matrix.rows.length > 6 ? "end" : "middle"} height={matrix.rows.length > 6 ? 56 : 30} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {matrix.cols.map((c, idx) => (
                  <Bar
                    key={c.key}
                    dataKey={c.label}
                    stackId={view === "stacked" ? "a" : undefined}
                    fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                    radius={view === "stacked" ? undefined : [3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {matrix.observations.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3">
          {matrix.observations.map((o, i) => (
            <li key={i} className="text-[13px] text-muted-foreground">• {o}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
