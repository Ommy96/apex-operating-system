import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrency(orgBaseCurrency: string = 'KES') {
  const { data: rates = {}, isLoading } = useQuery({
    queryKey: ["currency-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currency_rates")
        .select("base_currency, target_currency, rate");
      if (error) throw error;
      const rateMap: Record<string, number> = {};
      for (const r of data || []) {
        rateMap[`${r.base_currency}_${r.target_currency}`] = Number(r.rate);
      }
      return rateMap;
    },
    staleTime: 60 * 60 * 1000, // 1 hour cache
  });

  const convertAmount = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    const directKey = `${fromCurrency.padEnd(3)}_${toCurrency.padEnd(3)}`;
    const directRate = rates[directKey];
    if (directRate) return Math.round(amount * directRate * 100) / 100;

    // Try via KES as pivot
    const toKes = rates[`${fromCurrency.padEnd(3)}_KES`];
    const fromKes = rates[`KES_${toCurrency.padEnd(3)}`];
    if (toKes && fromKes) return Math.round(amount * toKes * fromKes * 100) / 100;

    return amount; // Fallback: return original
  };

  const formatAmount = (amount: number, currency: string): string => {
    const localeMap: Record<string, string> = {
      KES: 'en-KE', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB',
      CHF: 'de-CH', SEK: 'sv-SE', NOK: 'nb-NO', DKK: 'da-DK',
    };
    return new Intl.NumberFormat(localeMap[currency] || 'en-US', {
      style: 'currency',
      currency: currency.trim(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return { rates, convertAmount, formatAmount, isLoading, baseCurrency: orgBaseCurrency };
}
