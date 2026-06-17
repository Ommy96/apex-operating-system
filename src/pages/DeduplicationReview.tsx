import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Users, Merge, X, AlertTriangle, ExternalLink, ScanSearch } from 'lucide-react';

const reasonLabel: Record<string, string> = {
  name_similarity: 'Name similarity',
  phonetic_first: 'Sounds like (first)',
  phonetic_last: 'Sounds like (last)',
  dob_exact: 'Same DOB',
  dob_within_1y: 'DOB within 1y',
  sub_county_match: 'Same sub-county',
  household_match: 'Same household',
};

function ReasonBadges({ reasons }: { reasons: Record<string, any> }) {
  const items: string[] = [];
  for (const [k, v] of Object.entries(reasons || {})) {
    if (k === 'name_similarity' && typeof v === 'number' && v > 0)
      items.push(`${reasonLabel[k]} ${Math.round(v * 100)}%`);
    else if (v === true && reasonLabel[k]) items.push(reasonLabel[k]);
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map((t) => (
        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
      ))}
    </div>
  );
}

interface Candidate {
  id: string;
  beneficiary_id_a: string;
  beneficiary_id_b: string;
  match_score: number;
  match_reasons: Record<string, any>;
  detected_at: string;
  a?: any;
  b?: any;
}

export default function DeduplicationReview() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();

  const [scanning, setScanning] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<Candidate | null>(null);
  const [canonicalId, setCanonicalId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [distinctTarget, setDistinctTarget] = useState<Candidate | null>(null);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['duplicate-candidates', orgId],
    queryFn: async (): Promise<Candidate[]> => {
      const { data, error } = await supabase
        .from('duplicate_candidates')
        .select('id, beneficiary_id_a, beneficiary_id_b, match_score, match_reasons, detected_at, status')
        .eq('organization_id', orgId!)
        .eq('status', 'pending')
        .order('match_score', { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((data || []).flatMap((d: any) => [d.beneficiary_id_a, d.beneficiary_id_b])));
      if (ids.length === 0) return [];
      const { data: ben } = await supabase
        .from('beneficiaries')
        .select('id, first_name, last_name, display_name, date_of_birth, sub_county, household_id, created_at, unique_id')
        .in('id', ids);
      const byId = new Map((ben || []).map((b: any) => [b.id, b]));
      return (data || []).map((d: any) => ({ ...d, a: byId.get(d.beneficiary_id_a), b: byId.get(d.beneficiary_id_b) }));
    },
    enabled: !!orgId,
  });

  /** Scan: walk a window of recent beneficiaries and upsert new candidate pairs. */
  const runScan = async () => {
    if (!orgId) return;
    setScanning(true);
    try {
      const { data: list, error } = await supabase
        .from('beneficiaries')
        .select('id, first_name, last_name, date_of_birth, sub_county, household_id')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .limit(500);
      if (error) throw error;
      let inserted = 0;
      for (const b of list || []) {
        if (!b.first_name || !b.last_name) continue;
        const { data: matches } = await supabase.rpc('fuzzy_match_beneficiaries', {
          _org_id: orgId,
          _first_name: b.first_name,
          _last_name: b.last_name,
          _dob: b.date_of_birth,
          _sub_county: b.sub_county,
          _household_id: b.household_id,
          _exclude_id: b.id,
        });
        for (const m of (matches as any[]) || []) {
          if (m.match_score <= 70) continue;
          const [a, c] = b.id < m.id ? [b.id, m.id] : [m.id, b.id];
          const { error: insErr } = await supabase.from('duplicate_candidates').insert({
            organization_id: orgId,
            beneficiary_id_a: a,
            beneficiary_id_b: c,
            match_score: m.match_score,
            match_reasons: m.match_reasons,
          });
          if (!insErr) inserted += 1;
        }
      }
      toast({ title: 'Scan complete', description: `${inserted} new candidate pair(s) added.` });
      qc.invalidateQueries({ queryKey: ['duplicate-candidates'] });
    } catch (e: any) {
      toast({ title: 'Scan failed', description: e?.message, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const mergeMutation = useMutation({
    mutationFn: async () => {
      if (!mergeTarget || !canonicalId) throw new Error('Pick a canonical record');
      const dupId = canonicalId === mergeTarget.beneficiary_id_a
        ? mergeTarget.beneficiary_id_b
        : mergeTarget.beneficiary_id_a;
      const { data, error } = await supabase.rpc('merge_beneficiaries', {
        _candidate_id: mergeTarget.id,
        _canonical_id: canonicalId,
        _duplicate_id: dupId,
        _note: note || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Records merged' });
      setMergeTarget(null);
      setCanonicalId(null);
      setNote('');
      qc.invalidateQueries({ queryKey: ['duplicate-candidates'] });
    },
    onError: (e: any) => toast({ title: 'Merge failed', description: e?.message, variant: 'destructive' }),
  });

  const distinctMutation = useMutation({
    mutationFn: async (c: Candidate) => {
      const { error } = await supabase
        .from('duplicate_candidates')
        .update({ status: 'reviewed_distinct', resolved_by: user?.id, resolved_at: new Date().toISOString() })
        .eq('id', c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Marked as distinct' });
      setDistinctTarget(null);
      qc.invalidateQueries({ queryKey: ['duplicate-candidates'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message, variant: 'destructive' }),
  });

  const openMerge = (c: Candidate) => {
    // Default canonical = older record
    const olderId = c.a && c.b
      ? new Date(c.a.created_at) <= new Date(c.b.created_at) ? c.a.id : c.b.id
      : c.beneficiary_id_a;
    setCanonicalId(olderId);
    setMergeTarget(c);
  };

  const PersonCard = ({ b, isCanonical, onPick }: { b: any; isCanonical?: boolean; onPick?: () => void }) => (
    <div className={`p-3 rounded-lg border ${isCanonical ? 'border-primary bg-primary/5' : 'bg-muted'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">
            {b?.display_name || [b?.first_name, b?.last_name].filter(Boolean).join(' ') || '—'}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
            {b?.unique_id && <div className="font-mono">{b.unique_id}</div>}
            <div>DOB: {b?.date_of_birth ?? 'N/A'}</div>
            <div>Sub-county: {b?.sub_county ?? 'N/A'}</div>
            <div>Created: {b?.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}</div>
          </div>
        </div>
        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => window.open(`/beneficiary/${b?.id}`, '_blank')}>
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
      {onPick && (
        <Button
          size="sm"
          variant={isCanonical ? 'default' : 'outline'}
          className="mt-2 w-full"
          onClick={onPick}
        >
          {isCanonical ? 'Keep this record' : 'Make canonical'}
        </Button>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" /> Deduplication Review
            </h1>
            <p className="text-sm text-muted-foreground">
              Fuzzy + phonetic matching. Every merge requires human approval and is logged.
            </p>
          </div>
          <Button onClick={runScan} disabled={scanning || !orgId}>
            <ScanSearch className="h-4 w-4 mr-1" />
            {scanning ? 'Scanning…' : 'Run scan'}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : candidates.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No pending duplicates. Run a scan to detect new pairs.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {candidates.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant={c.match_score >= 85 ? 'destructive' : 'default'}>
                      {c.match_score}% match
                    </Badge>
                    <span className="text-xs text-muted-foreground font-normal">
                      Detected {new Date(c.detected_at).toLocaleDateString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <PersonCard b={c.a} />
                    <PersonCard b={c.b} />
                  </div>
                  <ReasonBadges reasons={c.match_reasons} />
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => openMerge(c)}>
                      <Merge className="h-3 w-3 mr-1" /> Merge
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDistinctTarget(c)}>
                      <X className="h-3 w-3 mr-1" /> Mark distinct
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Merge dialog */}
      <Dialog open={!!mergeTarget} onOpenChange={(v) => !v && setMergeTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" /> Confirm merge
            </DialogTitle>
            <DialogDescription>
              Pick the canonical record. The other record will be soft-deleted and all
              its related rows (services, donors, guardians, activities, allocations…)
              will be re-pointed to the canonical one. <strong>This is logged and not silently reversible.</strong>
            </DialogDescription>
          </DialogHeader>

          {mergeTarget && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PersonCard
                b={mergeTarget.a}
                isCanonical={canonicalId === mergeTarget.beneficiary_id_a}
                onPick={() => setCanonicalId(mergeTarget.beneficiary_id_a)}
              />
              <PersonCard
                b={mergeTarget.b}
                isCanonical={canonicalId === mergeTarget.beneficiary_id_b}
                onPick={() => setCanonicalId(mergeTarget.beneficiary_id_b)}
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Resolution note (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Same person, two registrations from different field visits."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setMergeTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!canonicalId || mergeMutation.isPending}
              onClick={() => mergeMutation.mutate()}
            >
              <Merge className="h-4 w-4 mr-1" />
              {mergeMutation.isPending ? 'Merging…' : 'Merge records'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark distinct confirm */}
      <AlertDialog open={!!distinctTarget} onOpenChange={(v) => !v && setDistinctTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as distinct?</AlertDialogTitle>
            <AlertDialogDescription>
              These two records will be remembered as different people. They won't appear in the queue again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => distinctTarget && distinctMutation.mutate(distinctTarget)}>
              Mark distinct
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
