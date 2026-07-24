import { motion, useReducedMotion } from "framer-motion";
import { Children, ReactNode, useRef } from "react";
import { DUR, EASE_OUT } from "@/lib/motion";

interface StaggerGridProps {
  children: ReactNode;
  className?: string;
  /** Max number of children to stagger; rest render instantly. */
  cap?: number;
  /** Per-item stagger in seconds. */
  step?: number;
  /** Vertical translate distance in px. */
  distance?: number;
}

/**
 * Stagger-fades the first `cap` children up into view once per mount.
 * Children beyond the cap render immediately (no animation) to keep
 * long lists snappy. Guarded against replay on data refetch by using
 * initial={false} after the first frame.
 */
export function StaggerGrid({
  children,
  className,
  cap = 8,
  step = 0.05,
  distance = 10,
}: StaggerGridProps) {
  const reduced = useReducedMotion();
  const playedRef = useRef(false);
  const items = Children.toArray(children);

  if (reduced) {
    return <div className={className}>{items}</div>;
  }

  const initial = playedRef.current ? false : "hidden";
  // Mark as played on next tick so subsequent renders skip entrance.
  if (!playedRef.current) {
    queueMicrotask(() => { playedRef.current = true; });
  }

  return (
    <motion.div
      className={className}
      initial={initial}
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: step } } }}
    >
      {items.map((child, i) => {
        if (i >= cap) return <div key={i}>{child}</div>;
        return (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, y: distance },
              visible: { opacity: 1, y: 0, transition: { duration: DUR.entrance, ease: EASE_OUT } },
            }}
          >
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}