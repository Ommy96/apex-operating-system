import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, LockOpen, Clock } from "lucide-react";

type Restriction = "restricted" | "unrestricted" | "time_restricted";

const META: Record<Restriction, { label: string; icon: any; className: string; help: string }> = {
  restricted: {
    label: "Restricted",
    icon: Lock,
    className: "border-[var(--status-warning)]/40 text-[var(--status-warning)] bg-[var(--status-warning-bg)]",
    help: "Restricted funds — must be used only for the stated purpose.",
  },
  unrestricted: {
    label: "Unrestricted",
    icon: LockOpen,
    className: "border-[var(--status-success)]/40 text-[var(--status-success)] bg-[var(--status-success-bg)]",
    help: "Unrestricted funds — may be applied wherever most needed.",
  },
  time_restricted: {
    label: "Time-restricted",
    icon: Clock,
    className: "border-[var(--status-info)]/40 text-[var(--status-info)] bg-[var(--status-info-bg)]",
    help: "Time-restricted funds — usable only within a defined period.",
  },
};

export function RestrictionBadge({
  restriction,
  note,
  className = "",
}: {
  restriction?: string | null;
  note?: string | null;
  className?: string;
}) {
  const r = (restriction as Restriction) ?? "restricted";
  const m = META[r] ?? META.restricted;
  const Icon = m.icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1 text-[10px] cursor-help ${m.className} ${className}`}
          >
            <Icon className="h-3 w-3" /> {m.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs">
            <div className="font-medium">{m.help}</div>
            {note ? <div className="text-muted-foreground mt-1">{note}</div> : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}