import { MotionConfig, useReducedMotion } from "framer-motion";
import { ReactNode, useEffect } from "react";

/**
 * Wraps the app in a MotionConfig that halves durations when the user
 * has prefers-reduced-motion set. Also sets a data attribute on <html>
 * so plain CSS animations (skeleton shimmer, hover lifts) can opt out.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    if (reduced) root.setAttribute("data-reduced-motion", "true");
    else root.removeAttribute("data-reduced-motion");
  }, [reduced]);

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: reduced ? 0.001 : undefined }}
    >
      {children}
    </MotionConfig>
  );
}