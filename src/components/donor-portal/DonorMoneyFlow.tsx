import { useState } from 'react';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { allocationTotal, ALLOCATION_FX_DISCLOSURE } from '@/lib/donorMoney';
import { AllocationAmount } from './AllocationAmount';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { allocationMoney } from '@/lib/donorMoney';
export function DonorMoneyFlow() {
  const { donorAllocations = [], currency, allocationsLoading } = useDonorPortal();
  const [from,setFrom] = useState(''); const [to,setTo] = useState('');
  const rows = donorAllocations.filter((a: any) => (!from || a.allocated_at.slice(0,10)>=from) && (!to || a.allocated_at.slice(0,10)<=to) && !['cancelled','redirected'].includes(a.status));
  const download = () => { const doc=new jsPDF(); doc.text('Donor allocation statement',14,18); doc.setFontSize(9); doc.text(ALLOCATION_FX_DISCLOSURE,14,28,{maxWidth:180}); autoTable(doc,{startY:42,head:[['Date','Destination','Amount']],body:rows.map((a:any)=>[a.allocated_at.slice(0,10),a.project?.name||a.program?.name||'Direct sponsorship',allocationMoney(a,currency)])}); doc.save('donor-allocation-statement.pdf'); };
  return <section className="space-y-4"><div className="flex flex-wrap gap-3 items-end"><div><Label htmlFor="allocation-from">From</Label><Input id="allocation-from" type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div><div><Label htmlFor="allocation-to">To</Label><Input id="allocation-to" type="date" value={to} onChange={e=>setTo(e.target.value)} /></div><Button disabled={!rows.length} onClick={download}><Download className="h-4 w-4 mr-2" />Statement</Button></div><p className="text-xs text-muted-foreground">{ALLOCATION_FX_DISCLOSURE}</p><h3 className="text-xl font-semibold">{allocationTotal(rows,currency)} allocated</h3>{allocationsLoading?<Skeleton className="h-40" />:rows.length?rows.map((a:any)=><div key={a.id} className="border-b py-3 flex flex-wrap justify-between gap-2"><span>{a.project?.name||a.program?.name||'Direct sponsorship'} · {a.allocated_at.slice(0,10)}</span><AllocationAmount allocation={a} currency={currency} /></div>):<p className="text-muted-foreground">No allocations recorded in this period. Recorded sponsorship funding is not an allocation.</p>}</section>;
}
