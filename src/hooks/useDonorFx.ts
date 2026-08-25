import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const FX_DISCLOSURE =
  'Converted at the rate on the date of each allocation. Historical figures are not restated at today\'s rate.';

export interface FxConversion {
  value: number;
  rate: number;
  rateDate: string | null;
  native: number;
  nativeCurrency: string;
  target: string;
  converted: boolean;
}

type Rate = { base_currency: string; target_currency: string; rate: number; rate_date: string | null };

/**
 * FX for the donor portal.
 *
 * Every conversion is done with the rate that applied ON THE DATE of the
 * underlying transaction (allocation / donation), never today's rate, so
 * historical figures stay truthful.
 */
export function useDonorFx(preferred: string | undefined) {
  const target = (preferred || 'USD').toUpperCase();

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['currency-rates-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_rates')
        .select('base_currency, target_currency, rate, rate_date')
        .limit(5000);
      if (error) throw error;
      return (data || []) as Rate[];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  function pick(from: string, to: string, on?: string | Date | null): Rate | null {
    const onDate = on ? new Date(on).toISOString().slice(0, 10) : null;
    const candidates = rates.filter(
      (r) =>
        (r.base_currency || '').toUpperCase() === from &&
        (r.target_currency || '').toUpperCase() === to,
    );
    if (!candidates.length) return null;
    const sorted = [...candidates].sort((a, b) =>
      String(a.rate_date || '').localeCompare(String(b.rate_date || '')),
    );
    if (!onDate) return sorted[sorted.length - 1];
    const onOrBefore = sorted.filter((r) => !r.rate_date || r.rate_date <= onDate);
    return onOrBefore.length ? onOrBefore[onOrBefore.length - 1] : sorted[0];
  }

  /** Full conversion detail — used for hover disclosure. */
  function detail(amount: number, from: string, on?: string | Date | null): FxConversion {
    const src = (from || target).toUpperCase();
    const base: FxConversion = {
      value: amount || 0,
      rate: 1,
      rateDate: null,
      native: amount || 0,
      nativeCurrency: src,
      target,
      converted: false,
    };
    if (!amount || src === target) return base;

    const direct = pick(src, target, on);
    if (direct) {
      return { ...base, value: amount * Number(direct.rate), rate: Number(direct.rate), rateDate: direct.rate_date, converted: true };
    }
    const inverse = pick(target, src, on);
    if (inverse && Number(inverse.rate) > 0) {
      const r = 1 / Number(inverse.rate);
      return { ...base, value: amount * r, rate: r, rateDate: inverse.rate_date, converted: true };
    }
    // No rate on file — show the native amount, clearly unconverted.
    return { ...base, nativeCurrency: src, target: src };
  }

  function convert(amount: number, from: string, on?: string | Date | null): number {
    return detail(amount, from, on).value;
  }

  function money(value: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(value || 0);
    } catch {
      return `${currency} ${Math.round(value || 0).toLocaleString()}`;
    }
  }

  function format(amount: number, from: string, on?: string | Date | null): string {
    const d = detail(amount, from, on);
    return money(d.value, d.target);
  }

  return { target, rates, isLoading, convert, detail, format, money, disclosure: FX_DISCLOSURE };
}

export type DonorFx = ReturnType<typeof useDonorFx>;
