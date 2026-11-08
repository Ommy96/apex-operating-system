import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { Skeleton } from '@/components/ui/skeleton';
import { allocationTotal, money, ALLOCATION_FX_DISCLOSURE } from '@/lib/donorMoney';
import { AllocationAmount } from './AllocationAmount';
export function DonorImpactFeed() {
  const { donorAccount, donorAllocations = [], totals, receivedDonations = [], currency, sponsoredBeneficiaries = [] } = useDonorPortal();
  const { data: updates = [], isLoading, error } = useQuery({
    queryKey: ['donor-portal', 'feed', donorAccount?.id, currency, 'all'], enabled: !!donorAccount,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('sponsorship_updates').select('id,title,content,created_at,update_type').eq('organization_id', donorAccount?.organization_id).eq('visible_to_donor', true).not('approved_at','is',null).is('deleted_at',null).order('created_at',{ascending:false});
      if (error) throw error;
      return data || [];
    }, staleTime: 30000, refetchOnWindowFocus: true, refetchOnReconnect: true,
  });
  const received = new Map<string, number>();
  receivedDonations.forEach((d: any) => received.set(d.currency, (received.get(d.currency) || 0) + Number(d.amount)));
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3 border-b pb-5">
      <div><p className="text-sm text-muted-foreground">Recorded sponsorship funding</p><p className="text-xl font-semibold">{money(totals.recorded, 'KES')}</p><p className="text-xs text-muted-foreground">Original currency · no captured allocation rate</p></div>
      <div><p className="text-sm text-muted-foreground">Received contributions</p><p className="text-xl font-semibold">{[...received].map(([c,v])=>money(v,c)).join(' + ') || 'No received contributions recorded'}</p></div>
      <div><p className="text-sm text-muted-foreground">Allocated</p><p className="text-xl font-semibold">{allocationTotal(donorAllocations, currency)}</p></div>
    </div>
    <p className="text-xs text-muted-foreground">{ALLOCATION_FX_DISCLOSURE}</p>
    {error && <p role="alert" className="text-destructive">Could not load approved updates: {error.message}</p>}
    {isLoading ? <Skeleton className="h-32" /> : updates.map((u: any) => <article key={u.id} className="border-b py-4"><h3 className="font-semibold">{u.title}</h3><p className="text-sm whitespace-pre-wrap">{u.content}</p><time className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</time></article>)}
    {donorAllocations.map((a: any) => <article key={a.id} className="border-b py-4 flex justify-between gap-3"><div><h3 className="font-semibold">Allocation recorded</h3><time className="text-xs text-muted-foreground">{new Date(a.allocated_at).toLocaleDateString()}</time></div><AllocationAmount allocation={a} currency={currency} /></article>)}
    {!updates.length && !donorAllocations.length && <p className="text-sm text-muted-foreground">{sponsoredBeneficiaries.length ? 'Sponsorship funding is recorded above. No approved updates or allocation records yet.' : 'No approved updates yet.'}</p>}
  </div>;
}
