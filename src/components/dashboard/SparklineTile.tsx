import { LucideIcon, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { TiltCard } from "@/components/motion/TiltCard";

export type TileTone = "teal" | "gold" | "info" | "warn" | "danger";

const TONE_RGB: Record<TileTone, string> = {
  teal: "var(--tile-teal)",
  gold: "var(--tile-gold)",
  info: "var(--tile-info)",
  warn: "var(--tile-warn)",
  danger: "var(--tile-danger)",
};

interface SparklineTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: TileTone;
  /** Small trend series (last N points) rendered as a low-opacity sparkline
   *  along the bottom of the tile. Optional — omit for tiles with no series. */
  series?: number[];
  /** Delta value; sign drives arrow + colour. Omit to hide. */
  delta?: number;
  deltaLabel?: string;
  /** Invert delta colour semantics (e.g. dropouts up = bad). */
  invertDelta?: boolean;
  /** Rare gold-highlight variant — reserved for one number per view. */
  highlight?: boolean;
  isLoading?: boolean;
}

function buildSparklinePath(series: number[], w: number, h: number, pad = 2) {
  if (!series.length) return "";
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(series.length - 1, 1);
  return series
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function SparklineTile({
  label,
  value,
  icon: Icon,
  tone = "teal",
  series,
  delta,
  deltaLabel,
  invertDelta = false,
  highlight = false,
  isLoading = false,
}: SparklineTileProps) {
  const rgbVar = highlight ? TONE_RGB.gold : TONE_RGB[tone];
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const positive = (delta ?? 0) > 0;
  const goodDirection = invertDelta ? !positive : positive;
  const deltaClass =
    (delta ?? 0) === 0
      ? "text-muted-foreground"
      : goodDirection
        ? "text-emerald-500"
        : "text-rose-500";
  const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;

  const spark = series && series.length >= 2 ? buildSparklinePath(series, 100, 24) : "";

  // Numeric values count up; strings render as-is (e.g. "12 / 45").
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^-?\d[\d,]*$/.test(value)
        ? Number(value.replace(/,/g, ""))
        : null;

  return (
    <TiltCard className="elevated-tile p-4 hover-lift"
      style={{ ["--tile-rgb" as string]: rgbVar }}
    >
      <div className="tile-wash" />
      <div className="tile-content flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[10px] font-medium uppercase tracking-[0.5px]"
            style={{ color: "var(--brand-ink-3)" }}
          >
            {label}
          </span>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-[10px]"
            style={{
              background: `rgba(${rgbVar}, 0.16)`,
              color: `rgb(${rgbVar})`,
            }}
            aria-hidden
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        </div>

        {isLoading ? (
          <>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <div
              className="text-[26px] font-semibold tabular-nums leading-none"
              style={{
                color: highlight ? `rgb(${rgbVar})` : "var(--brand-ink)",
                letterSpacing: "-0.6px",
              }}
            >
              {numericValue !== null ? (
                <AnimatedNumber value={numericValue} />
              ) : (
                value
              )}
            </div>
            {showDelta && (
              <div className={cn("flex items-center gap-1 text-[11px] font-medium", deltaClass)}>
                <DeltaIcon className="h-3 w-3" />
                <span className="tabular-nums">
                  {positive ? "+" : ""}
                  {delta!.toFixed(1)}%
                </span>
                {deltaLabel && (
                  <span className="font-normal" style={{ color: "var(--brand-ink-3)" }}>
                    {deltaLabel}
                  </span>
                )}
              </div>
            )}
            {!showDelta && deltaLabel && (
              <span
                className="text-[10px] font-medium"
                style={{ color: "var(--brand-ink-3)" }}
              >
                {deltaLabel}
              </span>
            )}
          </>
        )}

        {spark && !isLoading && (
          <svg
            viewBox="0 0 100 24"
            preserveAspectRatio="none"
            className="mt-1 h-6 w-full opacity-70 sparkline-draw"
            aria-hidden
          >
            <defs>
              <linearGradient id={`spark-${label}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={`rgb(${rgbVar})`} stopOpacity="0.35" />
                <stop offset="100%" stopColor={`rgb(${rgbVar})`} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${spark} L100,24 L0,24 Z`}
              fill={`url(#spark-${label})`}
            />
            <path
              d={spark}
              fill="none"
              stroke={`rgb(${rgbVar})`}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
              className="sparkline-path"
            />
          </svg>
        )}
      </div>
    </TiltCard>
  );
}