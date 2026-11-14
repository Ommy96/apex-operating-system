import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, MapPinOff } from 'lucide-react';
import type { VulnerabilityMapData } from '@/hooks/useVulnerabilityMap';

export function ColdZoneList({ data, loading, canManage, saving, onSave }: { data?: VulnerabilityMapData; loading: boolean; canManage: boolean; saving: boolean; onSave: (days: number) => void }) {
  const [days, setDays] = useState(45);
  useEffect(() => { if (data) setDays(data.visit_gap_days); }, [data]);
  return <aside className="min-w-0 space-y-4">
    <div><h2 className="text-lg font-semibold">Cold zones</h2><p className="text-sm text-muted-foreground">At least 50% high / critical need · {data?.visit_gap_days ?? 45}+ days without a visit</p></div>
    {canManage && <div className="flex items-end gap-2"><div><Label htmlFor="visit-gap">Visit gap (days)</Label><Input id="visit-gap" type="number" min={1} max={3650} value={days} onChange={e => setDays(Number(e.target.value))} /></div><Button variant="outline" size="icon" aria-label="Save visit-gap threshold" title="Save visit-gap threshold" disabled={saving || !Number.isInteger(days) || days < 1 || days > 3650} onClick={() => onSave(days)}><Save className="h-4 w-4" /></Button></div>}
    {loading ? <Skeleton className="h-48 w-full" /> : data && <>
      {!data.cold_zones.length && <p className="py-8 text-sm text-muted-foreground">No areas qualify as cold zones.</p>}
      <ol className="divide-y">{data.cold_zones.map((a, i) => <li key={`${a.county}:${a.area_kind}:${a.area}`} className="py-3 space-y-1"><h3 className="font-medium capitalize">{i + 1}. {a.area}</h3><div className="text-sm tabular-nums">{a.beneficiaries} beneficiaries · {Math.round((a.high_share ?? 0) * 100)}% high / critical</div><p className="text-sm text-muted-foreground">{a.days_since_visit == null ? 'No recorded visit' : `${a.days_since_visit} days since last visit`}</p>{!a.centroid && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPinOff className="h-3 w-3" /> Area centre unavailable</span>}</li>)}</ol>
      <div className="border-t pt-3 space-y-2">{data.areas.filter(a => a.suppressed || a.high_share == null || !a.centroid).map(a => <p key={`${a.county}:${a.area_kind}:${a.area}`} className="text-xs text-muted-foreground capitalize">{a.area}: {a.suppressed ? 'insufficient data' : a.high_share == null ? 'no reviewed assessment data' : 'area centre unavailable'}</p>)}</div>
    </>}
  </aside>;
}