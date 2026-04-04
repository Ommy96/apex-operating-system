import { ReactNode } from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "info";
  className?: string;
}

const variantStyles = {
  default: "",
  primary: "bg-gradient-card-navy border-card-navy",
  success: "bg-gradient-card-sky border-card-sky",
  warning: "bg-gradient-card-amber border-card-amber",
  info: "bg-gradient-card-blue border-card-blue",
};

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "text-[var(--status-success)] bg-[var(--status-success-bg)]",
  warning: "text-[var(--status-warning)] bg-[var(--status-warning-bg)]",
  info: "text-[var(--status-info)] bg-[var(--status-info-bg)]",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? "text-[var(--status-success)]"
      : trend.value < 0
      ? "text-[var(--status-danger)]"
      : "text-muted-foreground"
    : "";

  return (
    <div
      className={cn(
        "rounded-[14px] border bg-card p-4 transition-shadow duration-150 hover:shadow-elevation-2",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.5px] mb-2 truncate">
            {title}
          </p>
          <p className="text-[24px] font-semibold text-foreground truncate tabular-nums" style={{ letterSpacing: '-0.8px' }}>
            {value}
          </p>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {description}
            </p>
          )}
          {trend && TrendIcon && (
            <div className={cn("flex items-center gap-1 mt-2 text-[11px]", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span className="font-medium tabular-nums">
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
              iconStyles[variant]
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
        )}
      </div>
    </div>
  );
}
