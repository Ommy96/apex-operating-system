import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { ArrowDown, ArrowUp, Minus, ChevronRight, Copy, FileImage, Link as LinkIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AnalyticsQuestion, TABS, metricDef, dimensionKind } from "@/lib/analyticsConfig";
import { AnalyticsResult } from "@/hooks/useAnalyticsQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { buildSuggestions } from "@/lib/analyticsSuggestions";
import { cn } from "@/lib/utils";
import { toCsv } from "@/lib/analyticsExport";
import { toast } from "sonner";

interface Props {
  question: AnalyticsQuestion;
  result: AnalyticsResult | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  accent: string;
  onDrillDown: (dimension: string, value: string) => void;
  onApplySuggestion: (patch: Partial<AnalyticsQuestion>) => void;
  onToggleBreakdown: (dim: string) => void;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

function deltaInfo(value: number, prev: number | null, good: "up" | "down" | "neutral") {
  if (prev === null || prev === 0) return { label: "—", tone: "muted" as const, Icon: Minus };
  const delta = value - prev;
  const pct = (delta / prev) * 100;
  const isUp = delta > 0;
  const tone: "good" | "bad" | "muted" =
    delta === 0 || good === "neutral"
      ? "muted"
      : (isUp && good === "up") || (!isUp && good === "down")
        ? "good"
        : "bad";
  const Icon = delta === 0 ? Minus : isUp ? ArrowUp : ArrowDown;
  const label = `${isUp ? "+" : ""}${pct.toFixed(1)}% vs previous period`;
  return { label, tone, Icon };
}

function ChartIconRow({ onCopyCsv, onCopyLink }: { onCopyCsv: () => void; onCopyLink: () => void }) {
  return (
    <div className="absolute right-2 top-2 flex items-center gap-1">
      <button
        type="button"
        onClick={onCopyCsv}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Copy CSV"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => {/* image copy is browser-limited */}}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Copy image"
      >
        <FileImage className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onCopyLink}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Copy share link"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function AnswerArea({
  question,
  result,
  isLoading,
  isError,
  errorMessage,
  accent,
  onDrillDown,
  onApplySuggestion,
  onToggleBreakdown,
}: Props) {
  const tabCfg = TABS[question.tab];
  const mdef = metricDef(question.tab, question.metric);
  const kind = dimensionKind(question.tab, question.dimension);

  const handleCopyCsv = () => {
    if (!result?.series.length) return;
    const csv = toCsv(result.series.map((s) => ({ [question.dimension]: s.label, [question.metric]: s.value })));
    navigator.clipboard?.writeText(csv);
    toast.success("CSV copied to clipboard");
  };
  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Share link copied");
  };

  if (!tabCfg.implemented) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <EmptyState
          title={`${tabCfg.label} analytics — coming soon`}
          hint="The framework supports this tab; the metric handlers will land in a follow-up pass."
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <EmptyState title="Couldn't load this view" hint={errorMessage ?? "Try changing the question or refreshing."} />
      </div>
    );
  }

  const series = result?.series ?? [];
  const headlineVal = result?.headline.value ?? 0;
  const di = deltaInfo(headlineVal, result?.headline.previousValue ?? null, mdef?.goodDirection ?? "up");
  const lastUpdated = result?.headline.lastUpdated
    ? formatDistanceToNow(new Date(result.headline.lastUpdated), { addSuffix: true })
    : null;

  const suggestions = useMemo(() => buildSuggestions(question), [question]);

  return (
    <div className="space-y-6">
      {/* Headline */}
      <div>
        <div className="flex items-baseline gap-3">
          {isLoading ? (
            <Skeleton className="h-10 w-40" />
          ) : (
            <span className="text-[32px] font-medium leading-none tabular-nums text-foreground" style={{ fontFamily: "DM Sans, system-ui" }}>
              {formatNumber(headlineVal)}
            </span>
          )}
          {!isLoading && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[13px]",
                di.tone === "good" && "text-emerald-600 dark:text-emerald-400",
                di.tone === "bad" && "text-amber-600 dark:text-amber-400",
                di.tone === "muted" && "text-muted-foreground"
              )}
            >
              <di.Icon className="h-3.5 w-3.5" />
              {di.label}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-[13px] text-muted-foreground">
          <span>{mdef?.caption ?? `${mdef?.label ?? question.metric} in selected scope`}</span>
          {lastUpdated && <span>· Last updated {lastUpdated}</span>}
        </div>
      </div>

      {/* Main chart */}
      <div className="relative rounded-xl border border-border bg-card p-4">
        <ChartIconRow onCopyCsv={handleCopyCsv} onCopyLink={handleCopyLink} />
        <div className="h-[280px] md:h-[320px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : series.length === 0 ? (
            <EmptyState
              title="Not enough data yet to chart this"
              hint={
                question.tab === "people"
                  ? "Enrol your first beneficiary to start the People analytics."
                  : "Record activity to start the Programmes analytics."
              }
            />
          ) : kind === "time" ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="apexFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2} fill="url(#apexFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", fontSize: 12 }}
                />
                <Bar
                  dataKey="value"
                  fill={accent}
                  radius={[0, 4, 4, 0]}
                  onClick={(d: any) => onDrillDown(question.dimension, d.key)}
                  cursor="pointer"
                >
                  {series.map((s) => (
                    <Cell key={s.key} fill={accent} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Breakdown chips */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Break it down by</div>
        <div className="flex flex-wrap gap-2">
          {tabCfg.dimensions
            .filter((d) => d.key !== question.dimension)
            .slice(0, 8)
            .map((d) => {
              const active = question.breakdowns.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => onToggleBreakdown(d.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    active
                      ? "border-transparent text-primary-foreground"
                      : "border-border text-foreground hover:bg-muted"
                  )}
                  style={active ? { backgroundColor: accent } : undefined}
                >
                  {d.label}
                </button>
              );
            })}
        </div>
      </div>

      {/* Suggested next questions */}
      {suggestions.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Suggested next questions</div>
          <div className="space-y-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onApplySuggestion(s.patch)}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted"
              >
                <span>{s.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}