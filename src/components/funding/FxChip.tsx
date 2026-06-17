import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface Props {
  nativeCurrency: string;
  baseCurrency: string;
  rate: number | string;
  at: string | Date | null | undefined;
}

export function FxChip({ nativeCurrency, baseCurrency, rate, at }: Props) {
  const r = Number(rate ?? 0);
  const when = at ? new Date(at) : new Date();
  const label = `${nativeCurrency} 1 = ${baseCurrency} ${r.toFixed(2)}`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="font-mono text-[10px] cursor-help">FX</Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-xs">
            <div className="font-medium">{label}</div>
            <div className="text-muted-foreground">{format(when, "d MMM yyyy, HH:mm")}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}