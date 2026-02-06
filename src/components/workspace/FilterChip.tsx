import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterChipProps {
  label: string;
  active?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  count?: number;
  className?: string;
}

export function FilterChip({
  label,
  active = false,
  onToggle,
  onRemove,
  count,
  className,
}: FilterChipProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "filter-chip",
        active ? "filter-chip-active" : "filter-chip-inactive",
        className
      )}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn(
          "ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
          active ? "bg-primary/20" : "bg-muted"
        )}>
          {count}
        </span>
      )}
      {onRemove && active && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 -mr-1 hover:bg-primary/20 rounded-full p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </button>
  );
}

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {children}
    </div>
  );
}
