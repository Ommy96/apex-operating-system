import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DonorFx } from '@/hooks/useDonorFx';

interface FxAmountProps {
  amount: number;
  currency: string;
  /** Date the money moved — the FX rate on this date is used. */
  on?: string | Date | null;
  fx: DonorFx;
  className?: string;
}

/**
 * Renders a monetary figure in the donor's preferred currency, converted with
 * the rate that applied on the transaction date. Hovering shows the native
 * amount and the exact rate used.
 */
export function FxAmount({ amount, currency, on, fx, className }: FxAmountProps) {
  const d = fx.detail(amount || 0, currency, on);
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className} tabIndex={0}>
            {fx.money(d.value, d.target)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] text-xs">
          <p className="font-medium">
            {fx.money(d.native, d.nativeCurrency)} <span className="text-muted-foreground">native</span>
          </p>
          {d.converted ? (
            <p className="text-muted-foreground">
              Rate {d.rate.toFixed(4)} {d.nativeCurrency}→{d.target}
              {d.rateDate ? ` as at ${d.rateDate}` : ''}
            </p>
          ) : (
            <p className="text-muted-foreground">No rate on file — shown in its native currency.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
