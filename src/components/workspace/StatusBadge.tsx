import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "danger" | "info" | "muted";

interface StatusBadgeProps {
  variant: StatusVariant;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  success: "status-badge-success",
  warning: "status-badge-warning",
  danger: "status-badge-danger",
  info: "status-badge-info",
  muted: "status-badge-muted",
};

const dotColors: Record<StatusVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground",
};

export function StatusBadge({
  variant,
  children,
  dot = false,
  className,
}: StatusBadgeProps) {
  return (
    <span className={cn("status-badge", variantClasses[variant], className)}>
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

// Helper function to map common statuses to variants
export function getStatusVariant(status: string): StatusVariant {
  const statusLower = status.toLowerCase();
  
  if (["active", "completed", "approved", "success", "done"].includes(statusLower)) {
    return "success";
  }
  if (["pending", "in_progress", "ongoing", "in progress"].includes(statusLower)) {
    return "warning";
  }
  if (["inactive", "overdue", "urgent", "failed", "risk", "cancelled"].includes(statusLower)) {
    return "danger";
  }
  if (["draft", "new", "info", "planned"].includes(statusLower)) {
    return "info";
  }
  return "muted";
}
