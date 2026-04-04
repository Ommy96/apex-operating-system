import { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface WorkspacePanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "px-[18px] py-4",
  lg: "p-6",
};

export function WorkspacePanel({
  children,
  className,
  padding = "md",
  ...props
}: WorkspacePanelProps) {
  return (
    <div
      className={cn(
        "workspace-panel",
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface WorkspacePanelHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function WorkspacePanelHeader({
  title,
  description,
  actions,
  className,
}: WorkspacePanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 pb-3 border-b border-border",
        className
      )}
    >
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {description && (
          <p className="text-[12px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
