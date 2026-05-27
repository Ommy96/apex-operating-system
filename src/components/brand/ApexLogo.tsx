import { cn } from "@/lib/utils";
import { PRODUCT_NAME } from "@/config/brand";

interface ApexLogoProps {
  className?: string;
  variant?: "full" | "mark";
  /** Tailwind text color class applied to the wordmark (default: text-foreground). */
  wordmarkClassName?: string;
}

/**
 * ApexOS wordmark — geometric ascending peak mark + wordmark.
 * Uses the active theme's `primary` color for the mark.
 */
export function ApexLogo({
  className,
  variant = "full",
  wordmarkClassName,
}: ApexLogoProps) {
  const Mark = (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-7 w-7 shrink-0"
      aria-hidden="true"
    >
      {/* Outer ascending peak */}
      <path
        d="M16 3 L29 28 H3 Z"
        className="fill-primary"
      />
      {/* Inner notch — gives an "apex / chevron" depth */}
      <path
        d="M16 12 L23 26 H9 Z"
        className="fill-background"
        opacity="0.92"
      />
      {/* Small inner peak accent */}
      <path
        d="M16 17 L20.5 26 H11.5 Z"
        className="fill-primary"
      />
    </svg>
  );

  if (variant === "mark") {
    return (
      <span className={cn("inline-flex items-center", className)} aria-label={PRODUCT_NAME}>
        {Mark}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label={PRODUCT_NAME}>
      {Mark}
      <span
        className={cn(
          "font-semibold tracking-tight text-[15px] leading-none",
          wordmarkClassName ?? "text-foreground",
        )}
        style={{ letterSpacing: "-0.4px" }}
      >
        {PRODUCT_NAME}
      </span>
    </span>
  );
}

export default ApexLogo;