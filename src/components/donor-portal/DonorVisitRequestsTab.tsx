import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDonorPortal } from '@/hooks/useDonorPortal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
interface Props { donorAccountId: string; organizationId: string }
export function DonorVisitRequestsTab({donorAccountId}:Props) {
  const qc=useQueryClient(); const {sponsoredBeneficiaries=[],currency}=useDonorPortal();
  const [kind,setKind]=useState('visit_report'); const [beneficiary,setBeneficiary]=useState(''); const [purpose,setPurpose]=useState(''); const [date,setDate]=useState('');
  const beneficiaries=[...new Map(sponsoredBeneficiaries.filter((b:any)=>b.beneficiary).map((b:any)=>[b.beneficiary.id,b.beneficiary])).values()] as any[];
  const {data:requests=[],isLoading,error}=useQuery({queryKey:['donor-portal','requests',donorAccountId,currency,'all'],queryFn:async()=>{const {data,error}=await (supabase as any).rpc('get_donor_requests');if(error)throw error;return data||[];},staleTime:30000,refetchOnWindowFocus:true,refetchOnReconnect:true});
  const create=useMutation({mutationFn:async()=>{const {data,error}=await (supabase as any).rpc('create_donor_request',{_beneficiary:beneficiary,_kind:kind,_purpose:purpose,_date:date||null});if(error)throw error;if(!data)throw new Error('Request was not saved');},onSuccess:()=>{toast.success('Request submitted for review');setPurpose('');qc.invalidateQueries({queryKey:['donor-portal']});},onError:(e:Error)=>toast.error(e.message)});
  return <section className="space-y-6"><h3 className="text-lg font-semibold">Visits and update requests</h3><div className="grid gap-3 sm:grid-cols-2"><div><Label>Request</Label><Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="visit_report">Visit report</SelectItem><SelectItem value="update">Progress update</SelectItem><SelectItem value="visit">Visit</SelectItem></SelectContent></Select></div><div><Label>Beneficiary</Label><Select value={beneficiary} onValueChange={setBeneficiary}><SelectTrigger><SelectValue placeholder="Select beneficiary" /></SelectTrigger><SelectContent>{beneficiaries.map(b=><SelectItem key={b.id} value={b.id}>{b.display_name} · {b.beneficiary_code}</SelectItem>)}</SelectContent></Select></div>{kind==='visit'&&<div><Label>Preferred date</Label><Input type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>}<div className="sm:col-span-2"><Label>Request details</Label><Textarea value={purpose} onChange={e=>setPurpose(e.target.value)} /></div></div><Button disabled={!beneficiary||create.isPending} onClick={()=>create.mutate()}>{create.isPending?'Submitting…':'Submit request'}</Button>{error&&<p role="alert" className="text-destructive">{error.message}</p>}{isLoading?<Skeleton className="h-32" />:requests.map((r:any)=><article key={r.id} className="border-b py-4 space-y-2"><div className="flex justify-between"><h4 className="font-semibold">{r.request_kind.replace('_',' ')}</h4><Badge variant="secondary">{r.status}</Badge></div><p className="text-sm">{r.purpose}</p>{r.approved_response?<p className="whitespace-pre-wrap text-sm border-l-2 pl-3">{r.approved_response}</p>:<p className="text-xs text-muted-foreground">No approved response yet.</p>}</article>)}</section>;
}
