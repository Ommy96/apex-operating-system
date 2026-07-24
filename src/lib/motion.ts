import type { Transition, Variants } from "framer-motion";

/**
 * ApexOS motion tokens.
 * All animations respect prefers-reduced-motion at the framer-motion
 * MotionConfig level (see src/components/motion/MotionRoot.tsx).
 * Only transform + opacity are animated to stay on the compositor.
 */

export const EASE_OUT: Transition["ease"] = [0.16, 1, 0.3, 1];
export const EASE_SPRING: Transition = { type: "spring", stiffness: 380, damping: 30, mass: 0.6 };

export const DUR = {
  micro: 0.15,
  entrance: 0.24,
  page: 0.22,
  chart: 0.6,
  count: 0.55,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.entrance, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.entrance, ease: EASE_OUT } },
};

export const stagger = (delayChildren = 0, staggerChildren = 0.05): Variants => ({
  hidden: {},
  visible: {
    transition: {
      delayChildren,
      staggerChildren,
      // Cap stagger effectively — items beyond the 8th appear instantly
      // because we render them outside the parent stagger container.
    },
  },
});

/** Route transition variants (used by RouteTransition). */
export const routeVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: DUR.page, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } },
};

/** Sync entrance-once semantics: guard against React Query refetches. */
export const ONCE_VIEWPORT = { once: true, amount: 0.15 } as const;