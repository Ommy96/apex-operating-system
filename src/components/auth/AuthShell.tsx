import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ApexLogo } from "@/components/brand/ApexLogo";
import { PRODUCT_TAGLINE, VENDOR } from "@/config/brand";
import { cn } from "@/lib/utils";

export interface AccentContent {
  /** Stable key so the copy crossfades when it changes. */
  key: string;
  pill?: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}

interface AuthShellProps {
  children: ReactNode;
  accent: AccentContent;
  /** Which side the accent panel occupies on wide screens. */
  accentSide?: "left" | "right";
  /** Hide the accent panel entirely (e.g. invitation screen). */
  showAccent?: boolean;
}

function useWide(query = "(min-width: 900px)") {
  const [wide, setWide] = useState(
    typeof window !== "undefined" ? window.matchMedia(query).matches : true,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setWide(mql.matches);
    mql.addEventListener("change", onChange);
    setWide(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return wide;
}

function AccentBody({ accent, compact }: { accent: AccentContent; compact?: boolean }) {
  return (
    <div className={cn("flex h-full flex-col justify-center", compact ? "gap-2" : "gap-5")}>
      {accent.pill && !compact && (
        <span className="inline-flex w-fit items-center rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
          {accent.pill}
        </span>
      )}
      <h2
        className={cn(
          "font-semibold tracking-tight text-white",
          compact ? "text-base" : "text-2xl leading-snug sm:text-[28px]",
        )}
      >
        {accent.headline}
      </h2>
      <p className={cn("text-white/85", compact ? "text-xs" : "max-w-sm text-sm leading-relaxed")}>
        {accent.body}
      </p>
      {accent.ctaLabel && (
        <button
          type="button"
          onClick={accent.onCta}
          className={cn(
            "w-fit rounded-xl border border-white/70 font-semibold text-white transition-colors",
            "hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
            compact ? "min-h-11 px-4 text-sm" : "mt-1 min-h-12 px-7 text-sm",
          )}
        >
          {accent.ctaLabel}
        </button>
      )}
      {!compact && (
        <p className="mt-6 text-xs italic text-white/70">Systems that understand Africa.</p>
      )}
    </div>
  );
}

export function AuthShell({
  children,
  accent,
  accentSide = "right",
  showAccent = true,
}: AuthShellProps) {
  const wide = useWide();
  const reduced = useReducedMotion();
  const split = wide && showAccent;
  const duration = reduced ? 0 : 0.45;
  const ease: [number, number, number, number] = [0.65, 0, 0.35, 1];

  // The panels are absolutely positioned so they can slide past each other,
  // so the card height is driven by measuring the form content.
  const formRef = useRef<HTMLDivElement>(null);
  const [formHeight, setFormHeight] = useState(600);
  useLayoutEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const measure = () => setFormHeight(Math.max(600, el.scrollHeight + 80));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [split, children]);

  const accentPanel = (
    <div
      className="h-full w-full px-8 py-10 lg:px-12"
      style={{
        background:
          "linear-gradient(150deg, var(--auth-teal-deep) 0%, var(--auth-teal) 48%, var(--auth-teal-lt) 100%)",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={accent.key}
          className="h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
        >
          <AccentBody accent={accent} />
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <div
      className="auth-scope relative min-h-screen w-full overflow-hidden px-4 py-8 sm:px-6"
      style={{
        background:
          "radial-gradient(1200px 600px at 12% -10%, rgba(31,168,145,0.16), transparent 60%)," +
          "radial-gradient(900px 520px at 96% 108%, rgba(224,178,85,0.10), transparent 60%)," +
          "linear-gradient(180deg, var(--auth-canvas) 0%, var(--auth-canvas-2) 100%)",
      }}
    >
      {/* Abstract institutional backdrop — non-literal geometry, very low opacity */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.16]">
        <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
          <defs>
            <linearGradient id="authline" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1FA891" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E0B255" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          {Array.from({ length: 14 }).map((_, i) => (
            <path
              key={i}
              d={`M-100 ${120 + i * 58} C 320 ${40 + i * 46}, 760 ${420 + i * 22}, 1560 ${180 + i * 50}`}
              fill="none"
              stroke="url(#authline)"
              strokeWidth={i % 4 === 0 ? 1.6 : 0.7}
            />
          ))}
        </svg>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1080px] flex-col">
        {/* Brand lockup */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <Link to="/" className="inline-flex w-fit flex-col gap-1">
            <ApexLogo wordmarkClassName="text-[var(--auth-text)] text-lg" />
            <span className="pl-9 text-xs tracking-wide text-[var(--auth-muted)]">
              {PRODUCT_TAGLINE}
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs text-[var(--auth-muted)] transition-colors hover:text-[var(--auth-text)]"
            style={{ borderColor: "var(--auth-border)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to ApexOS
          </Link>
        </div>


        <div className="flex flex-1 items-center">
          <div
            className="relative w-full overflow-hidden rounded-[20px] border"
            style={{
              borderColor: "var(--auth-border)",
              background: "var(--auth-surface)",
              boxShadow: "0 30px 80px -30px rgba(0,0,0,0.75)",
            }}
          >
            {split ? (
              <motion.div
                className="relative"
                initial={false}
                animate={{ height: formHeight }}
                transition={{ duration: reduced ? 0 : 0.3, ease }}
              >
                <motion.div
                  className="absolute inset-y-0 w-1/2"
                  initial={false}
                  animate={{ left: accentSide === "right" ? "0%" : "50%" }}
                  transition={{ duration, ease }}
                >
                  <div className="flex h-full items-center px-8 py-10 lg:px-12">
                    <div ref={formRef} className="w-full">{children}</div>
                  </div>
                </motion.div>
                <motion.div
                  className="absolute inset-y-0 w-1/2"
                  initial={false}
                  animate={{ left: accentSide === "right" ? "50%" : "0%" }}
                  transition={{ duration, ease }}
                >
                  {accentPanel}
                </motion.div>
              </motion.div>
            ) : (
              <div className="flex flex-col">
                {showAccent && (
                  <div
                    className="px-5 py-5 sm:px-8"
                    style={{
                      background:
                        "linear-gradient(120deg, var(--auth-teal-deep) 0%, var(--auth-teal) 60%, var(--auth-teal-lt) 100%)",
                    }}
                  >
                    <AccentBody accent={accent} compact />
                  </div>
                )}
                <div className="px-5 py-8 sm:px-8">{children}</div>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-6 flex flex-col items-center gap-2 text-xs text-[var(--auth-muted)] sm:flex-row sm:justify-between">
          <span>A product of {VENDOR}</span>
          <span className="flex items-center gap-4">
            <Link to="/privacy" className="transition-colors hover:text-[var(--auth-text)]">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-[var(--auth-text)]">
              Terms
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}

export default AuthShell;