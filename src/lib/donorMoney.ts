export const ALLOCATION_FX_DISCLOSURE = 'Converted at the rate on the date of each allocation. Missing historical rates remain in the recorded currency.';
export const RECEIVED_STATUSES = ['completed', 'succeeded', 'success', 'received'];
export interface CapturedAllocation {
  amount_base: number | string; base_currency: string; amount_native: number | string;
  native_currency: string; fx_rate: number | string; fx_at?: string; allocated_at?: string;
  fx_snapshot?: Record<string, number>; status?: string;
}
export function allocationValue(a: CapturedAllocation, target: string): number | null {
  const code = target.toUpperCase();
  if (code === a.native_currency?.toUpperCase()) return Number(a.amount_native);
  if (code === a.base_currency?.toUpperCase()) return Number(a.amount_base);
  const rate = Number(a.fx_snapshot?.[code]);
  return rate > 0 ? Number(a.amount_base) * rate : null;
}
export function money(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}
export function allocationMoney(a: CapturedAllocation, target: string) {
  const value = allocationValue(a, target);
  return value === null ? `${money(Number(a.amount_native), a.native_currency)} · historical FX unavailable` : money(value, target);
}
export function allocationTotal(rows: CapturedAllocation[], target: string) {
  const totals = new Map<string, number>();
  rows.filter(a => !['cancelled', 'redirected'].includes(a.status || '')).forEach(a => {
    const converted = allocationValue(a, target);
    const code = converted === null ? a.native_currency : target;
    totals.set(code, (totals.get(code) || 0) + (converted ?? Number(a.amount_native)));
  });
  return [...totals].map(([c, v]) => money(v, c)).join(' + ') || money(0, target);
}
export function receivedContribution(d: { amount: number | string; status: string }) {
  return Number(d.amount) > 0 && RECEIVED_STATUSES.includes(d.status.toLowerCase());
}
export function contactBirthdayAllowed(dob: string | null, consent: boolean, enabled: boolean) {
  return enabled && consent && !!dob && !Number.isNaN(new Date(dob).getTime());
}
export function sponsorDocumentAllowed(type: string | null, sensitive = false, consentType = false) {
  return !!type && !sensitive && !consentType && !/(consent|medical|health|intake|assessment|national_id|birth_cert|safeguard|legal|case)/i.test(type);
}