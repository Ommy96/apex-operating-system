import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AccentTone = "teal" | "amber" | "rose" | "blue" | "violet" | "slate";

const TONE_BAR: Record<AccentTone, string> = {
  teal: "bg-success",
  amber: "bg-warning",
  rose: "bg-destructive",
  blue: "bg-info",
  violet: "bg-info",
  slate: "bg-muted-foreground",
};

const TONE_ICON: Record<AccentTone, string> = {
  teal: "text-success bg-success/70",
  amber: "text-warning bg-warning/70",
  rose: "text-destructive bg-destructive/70",
  blue: "text-info bg-info/70",
  violet: "text-info bg-info/70",
  slate: "text-foreground bg-muted/70",
};

export interface AnalyticsKpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  tone?: AccentTone;
  delta?: number; // percentage change vs comparison period
  deltaLabel?: string; // e.g. "vs last year"
  /** When true, a positive delta is bad (e.g. dropouts). Inverts colouring. */
  invertDelta?: boolean;
  isLoading?: boolean;
}

/**
 * Small KPI card with a 3px left accent bar in the chosen tone, optional
 * icon, and an optional period-over-period delta.
 */
export function AnalyticsKpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "teal",
  delta,
  deltaLabel,
  invertDelta = false,
  isLoading = false,
}: AnalyticsKpiCardProps) {
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const positiveIsGood = !invertDelta;
  const isPositive = (delta ?? 0) > 0;
  const isNeutral = (delta ?? 0) === 0;

  const deltaClass = isNeutral
    ? "text-muted-foreground"
    : (isPositive && positiveIsGood) || (!isPositive && !positiveIsGood)
      ? "text-success"
      : "text-destructive";

  const DeltaIcon = isNeutral ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="relative flex h-full overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md">
      <div className={cn("w-[3px] flex-shrink-0", TONE_BAR[tone])} aria-hidden />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {Icon && (
            <span
              className={cn(
                "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg",
                TONE_ICON[tone]
              )}
              aria-hidden
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          {isLoading ? (
            <div className="h-7 w-20 animate-pulse rounded bg-muted" />
          ) : (
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {value}
            </span>
          )}
        </div>
        {sublabel && (
          <p className="text-xs text-muted-foreground line-clamp-1">{sublabel}</p>
        )}
        {showDelta && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", deltaClass)}>
            <DeltaIcon className="h-3 w-3" />
            <span className="tabular-nums">
              {isPositive ? "+" : ""}
              {delta!.toFixed(1)}%
            </span>
            {deltaLabel && (
              <span className="font-normal text-muted-foreground">{deltaLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
