import { allocationMoney, money, type CapturedAllocation } from '@/lib/donorMoney';
export function AllocationAmount({ allocation, currency }: { allocation: CapturedAllocation; currency: string }) {
  const rate = currency === allocation.base_currency ? 1 : currency === allocation.native_currency ? 1 / Number(allocation.fx_rate) : allocation.fx_snapshot?.[currency];
  return <span tabIndex={0} title={`${money(Number(allocation.amount_native), allocation.native_currency)} native · captured rate ${rate ?? 'unavailable'} · ${allocation.fx_at || allocation.allocated_at || ''}`}>{allocationMoney(allocation, currency)}</span>;
}