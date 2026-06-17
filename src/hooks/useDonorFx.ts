import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves rates needed to convert any base currency to the donor's preferred currency.
 * Tries direct, inverse, or fallback to 1.
 */
export function useDonorFx(preferred: string | undefined) {
  const target = (preferred || 'USD').toUpperCase();
  const { data: rates } = useQuery({
    queryKey: ['currency-rates', target],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_rates')
        .select('base_currency, target_currency, rate')
        .or(`target_currency.eq.${target},base_currency.eq.${target}`)
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  function convert(amount: number, from: string): number {
    if (!amount) return 0;
    const src = (from || target).toUpperCase();
    if (src === target) return amount;
    const direct = rates?.find((r) => r.base_currency === src && r.target_currency === target);
    if (direct) return amount * Number(direct.rate);
    const inverse = rates?.find((r) => r.base_currency === target && r.target_currency === src);
    if (inverse && Number(inverse.rate) > 0) return amount / Number(inverse.rate);
    return amount; // no rate yet — show native amount as fallback
  }

  function format(amount: number, from: string): string {
    const v = convert(amount, from);
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: target, maximumFractionDigits: 0 }).format(v);
    } catch {
      return `${target} ${Math.round(v).toLocaleString()}`;
    }
  }

  return { target, convert, format };
}