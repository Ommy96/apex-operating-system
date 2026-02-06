import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewSwitcherProps {
  views: {
    id: string;
    label: string;
    icon: LucideIcon;
  }[];
  activeView: string;
  onViewChange: (viewId: string) => void;
  className?: string;
}

export function ViewSwitcher({
  views,
  activeView,
  onViewChange,
  className,
}: ViewSwitcherProps) {
  return (
    <div className={cn("view-switcher", className)}>
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={cn(
            "view-switcher-item flex items-center gap-1.5",
            activeView === view.id
              ? "view-switcher-item-active"
              : "view-switcher-item-inactive"
          )}
        >
          <view.icon className="h-3.5 w-3.5" />
          <span>{view.label}</span>
        </button>
      ))}
    </div>
  );
}
