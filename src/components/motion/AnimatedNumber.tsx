import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  /** ms */
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

/**
 * Counts up from 0 to `value` on FIRST mount only (per page load).
 * Subsequent value changes snap without re-animating so React Query
 * refetches don't retrigger the count. Respects reduced-motion.
 */
export function AnimatedNumber({
  value,
  duration = 550,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const playedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (playedRef.current || reduced || !Number.isFinite(value)) {
      setDisplay(value);
      playedRef.current = true;
      return;
    }
    playedRef.current = true;
    const start = performance.now();
    const from = 0;
    const to = value;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(from + (to - from) * ease(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // Intentionally only depend on mount — see docstring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>{format(display)}</span>;
}