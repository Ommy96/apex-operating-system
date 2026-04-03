import { useCurrency } from "@/hooks/useCurrency";

interface CurrencyAmountProps {
  amount: number;
  currency: string;
  showOriginal?: boolean;
  baseCurrency?: string;
}

export function CurrencyAmount({ amount, currency, showOriginal = false, baseCurrency = 'KES' }: CurrencyAmountProps) {
  const { convertAmount, formatAmount } = useCurrency(baseCurrency);

  if (currency === baseCurrency || !showOriginal) {
    const displayAmount = currency !== baseCurrency ? convertAmount(amount, currency, baseCurrency) : amount;
    return <span>{formatAmount(displayAmount, baseCurrency)}</span>;
  }

  const converted = convertAmount(amount, currency, baseCurrency);
  return (
    <span>
      {formatAmount(converted, baseCurrency)}{' '}
      <span className="text-muted-foreground text-xs">({formatAmount(amount, currency)})</span>
    </span>
  );
}
