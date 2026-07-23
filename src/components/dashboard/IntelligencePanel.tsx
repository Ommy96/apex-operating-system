import { useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles, AlertTriangle, TrendingDown, CalendarClock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface IntelSignal {
  id: string;
  icon?: "risk" | "trend" | "clock";
  title: string;
  detail?: string;
  href: string;
  tone?: "teal" | "warn" | "danger" | "info";
}

interface IntelligencePanelProps {
  headline: string;
  subline?: string;
  signals: IntelSignal[];
  isLoading?: boolean;
}

const ICON_MAP = {
  risk: AlertTriangle,
  trend: TrendingDown,
  clock: CalendarClock,
} as const;

const TONE_RGB: Record<NonNullable<IntelSignal["tone"]>, string> = {
  teal: "var(--tile-teal)",
  warn: "var(--tile-warn)",
  danger: "var(--tile-danger)",
  info: "var(--tile-info)",
};

/**
 * Right-rail glass panel — surfaces existing dashboard signals as tappable
 * "recommended actions". Content only; no new data queries.
 */
export function IntelligencePanel({
  headline,
  subline,
  signals,
  isLoading = false,
}: IntelligencePanelProps) {
  const navigate = useNavigate();

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: "rgba(var(--tile-teal), 0.18)",
            color: "rgb(var(--tile-teal))",
          }}
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.6px]"
            style={{ color: "var(--brand-ink-3)" }}
          >
            ApexOS Intelligence
          </p>
        </div>
      </div>

      <p
        className="text-[14px] font-semibold leading-snug mb-1"
        style={{ color: "var(--brand-ink)", letterSpacing: "-0.2px" }}
      >
        {headline}
      </p>
      {subline && (
        <p className="text-[12px] mb-3" style={{ color: "var(--brand-ink-2)" }}>
          {subline}
        </p>
      )}

      <div
        className="mt-3 border-t pt-2"
        style={{ borderColor: "var(--elevated-hairline)" }}
      >
        <p
          className="text-[10px] font-medium uppercase tracking-[0.5px] mb-1"
          style={{ color: "var(--brand-ink-3)" }}
        >
          Recommended actions
        </p>
        {isLoading ? (
          <div className="space-y-2 py-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : signals.length === 0 ? (
          <p className="text-[12px] py-3" style={{ color: "var(--brand-ink-3)" }}>
            Everything looks healthy — no actions needed right now.
          </p>
        ) : (
          <ul className="flex flex-col">
            {signals.slice(0, 4).map((s) => {
              const Icon = ICON_MAP[s.icon ?? "risk"];
              const rgb = TONE_RGB[s.tone ?? "teal"];
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => navigate(s.href)}
                    className="w-full flex items-center gap-3 py-2 rounded-lg text-left transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus:outline-none"
                  >
                    <span
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: `rgba(${rgb}, 0.16)`,
                        color: `rgb(${rgb})`,
                      }}
                      aria-hidden
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className="block text-[12px] font-medium truncate"
                        style={{ color: "var(--brand-ink)" }}
                      >
                        {s.title}
                      </span>
                      {s.detail && (
                        <span
                          className="block text-[11px] truncate"
                          style={{ color: "var(--brand-ink-3)" }}
                        >
                          {s.detail}
                        </span>
                      )}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: "var(--brand-ink-3)" }}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}