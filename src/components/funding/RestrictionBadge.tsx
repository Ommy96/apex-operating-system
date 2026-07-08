import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, LockOpen, Clock } from "lucide-react";

type Restriction = "restricted" | "unrestricted" | "time_restricted";

const META: Record<Restriction, { label: string; icon: any; className: string; help: string }> = {
  restricted: {
    label: "Restricted",
    icon: Lock,
    className: "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10",
    help: "Restricted funds — must be used only for the stated purpose.",
  },
  unrestricted: {
    label: "Unrestricted",
    icon: LockOpen,
    className: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
    help: "Unrestricted funds — may be applied wherever most needed.",
  },
  time_restricted: {
    label: "Time-restricted",
    icon: Clock,
    className: "border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-500/10",
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