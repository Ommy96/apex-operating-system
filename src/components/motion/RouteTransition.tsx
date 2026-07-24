import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { routeVariants } from "@/lib/motion";

/**
 * Fades the current route's content out (120ms) and the next route
 * in with an 8px lift (~200ms). Keyed on pathname so route changes
 * trigger the transition; in-page state changes do not.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reduced = useReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={routeVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        style={{ willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}