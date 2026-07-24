import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { ReactNode, useRef } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Max rotation in degrees. Spec caps at 4deg. */
  max?: number;
}

/**
 * Subtle cursor-following 3D tilt. Reserved for stat tiles only —
 * this is the single pseudo-3D flourish in the product.
 * Springs back on leave. Disabled under reduced-motion and on touch.
 */
export function TiltCard({ children, className, style, max = 4 }: TiltCardProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const springCfg = { stiffness: 220, damping: 18, mass: 0.4 };
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [max, -max]), springCfg);
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-max, max]), springCfg);

  if (reduced) return <div className={className} style={style}>{children}</div>;

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{
        ...style,
        rotateX: rx,
        rotateY: ry,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {children}
    </motion.div>
  );
}