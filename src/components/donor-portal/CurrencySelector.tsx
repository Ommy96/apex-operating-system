import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { toast } from 'sonner';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS', 'ZAR', 'NGN', 'CAD', 'AUD'];

export function CurrencySelector() {
  const { donorAccount, updatePreferredCurrency } = useDonorPortal();
  const current = (donorAccount as any)?.preferred_currency || 'USD';

  return (
    <Select
      value={current}
      onValueChange={(v) =>
        updatePreferredCurrency.mutate(v, {
          onSuccess: () => toast.success(`Display currency set to ${v}`),
          onError: () => toast.error('Could not update currency'),
        })
      }
    >
      <SelectTrigger className="h-8 w-[88px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {CURRENCIES.map((c) => (
          <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}