import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Users, Merge, X } from 'lucide-react';

export default function DeduplicationReview() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();

  const { data: duplicates = [], isLoading } = useQuery({
    queryKey: ['potential-duplicates', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('find_potential_duplicates', { _org_id: orgId! });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const decideMutation = useMutation({
    mutationFn: async ({ idA, idB, decision }: { idA: string; idB: string; decision: string }) => {
      if (decision === 'merge') {
        // Soft-delete the newer record
        await supabase.from('beneficiaries').update({ deleted_at: new Date().toISOString() }).eq('id', idB);
      }
      await supabase.from('dedup_decisions').insert({
        organization_id: orgId,
        beneficiary_id_a: idA,
        beneficiary_id_b: idB,
        decision,
        decided_by: user?.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['potential-duplicates'] });
      toast({ title: 'Decision recorded' });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Deduplication Review
        </h1>
        <p className="text-muted-foreground">Review potential duplicate beneficiary records. Merging keeps the older record and soft-deletes the newer one.</p>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : duplicates.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No potential duplicates found</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {duplicates.map((d: any, i: number) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant={d.match_type === 'exact_match' ? 'destructive' : 'secondary'}>
                      {d.match_type === 'exact_match' ? 'Exact Match' : 'Similar'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">{d.name_a}</p>
                      <p className="text-xs text-muted-foreground">DOB: {d.dob_a || 'N/A'}</p>
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => window.open(`/beneficiary/${d.id_a}`, '_blank')}>View Profile</Button>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">{d.name_b}</p>
                      <p className="text-xs text-muted-foreground">DOB: {d.dob_b || 'N/A'}</p>
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => window.open(`/beneficiary/${d.id_b}`, '_blank')}>View Profile</Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => decideMutation.mutate({ idA: d.id_a, idB: d.id_b, decision: 'merge' })}>
                      <Merge className="h-3 w-3 mr-1" /> Merge (keep older)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decideMutation.mutate({ idA: d.id_a, idB: d.id_b, decision: 'distinct' })}>
                      <X className="h-3 w-3 mr-1" /> Not a duplicate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
