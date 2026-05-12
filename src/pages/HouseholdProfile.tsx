import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, Home, Loader2, MapPin, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useHousehold, useHouseholdMembers } from '@/hooks/useBeneficiaryRelationships';
import { useUpdateBeneficiaryHousehold } from '@/hooks/useBeneficiaryRelationships';
import { useBeneficiarySearch } from '@/hooks/useBeneficiarySearch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { calculateAge } from '@/lib/ageUtils';
import { useState } from 'react';
import { RegisterFamilySheet } from '@/components/beneficiary/RegisterFamilySheet';
import { formatDisplayDate } from '@/lib/dateUtils';

export default function HouseholdProfile() {
  const { householdId } = useParams<{ householdId: string }>();
  const navigate = useNavigate();
  const { data: household, isLoading } = useHousehold(householdId);
  const { data: members = [] } = useHouseholdMembers(householdId);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const memberIds = members.map((m: any) => m.id);
  const { searchTerm, setSearchTerm, results, isFetching } = useBeneficiarySearch(memberIds, 15);
  const updateHousehold = useUpdateBeneficiaryHousehold();

  const handleAddExisting = async (beneficiaryId: string) => {
    if (!householdId) return;
    try {
      await updateHousehold.mutateAsync({ beneficiaryId, householdId });
      toast({ title: 'Member added to household' });
      setSearchTerm('');
      setAddOpen(false);
    } catch (e: any) {
      toast({ title: 'Failed to add member', description: e?.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="text-center py-12">
        <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Household not found</h3>
        <Button variant="outline" onClick={() => navigate('/beneficiaries')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to beneficiaries
        </Button>
      </div>
    );
  }

  const head = members.find((m: any) => m.id === household.head_of_household_id);
  const vulnLevels: Record<string, number> = {};
  members.forEach((m: any) => {
    const v = m.vulnerability_level || 'low';
    vulnLevels[v] = (vulnLevels[v] || 0) + 1;
  });
  const highestVuln = ['critical', 'high', 'medium', 'low'].find((l) => vulnLevels[l]) || '—';

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-4 space-y-5">
      <button
        onClick={() => navigate('/beneficiaries')}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to beneficiaries
      </button>

      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl font-semibold">{household.household_name || 'Household'}</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 flex-wrap">
              {household.county && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{household.county}</Badge>}
              <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
              {head && (<><span>·</span><span><Crown className="h-3 w-3 inline mr-0.5" /> Head: <strong>{head.display_name}</strong></span></>)}
              <span>·</span>
              <span>Created {formatDisplayDate(household.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">Highest vulnerability: {highestVuln}</Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Members
            </h2>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add member
            </Button>
          </div>
          <div className="space-y-2">
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            )}
            {members.map((m: any) => {
              const age = calculateAge(m.date_of_birth);
              const isHead = m.id === household.head_of_household_id;
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/30 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                    {m.display_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {m.display_name}
                      {isHead && <Crown className="h-3 w-3 text-warning" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {age !== null ? `${age}y` : 'No DOB'}
                      {m.gender ? ` · ${m.gender}` : ''}
                      {m.vulnerability_level ? ` · ${m.vulnerability_level}` : ''}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/beneficiaries/${m.id}`)}>
                    View profile
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Vulnerability summary</h3>
            <div className="space-y-1.5 text-xs">
              {(['critical', 'high', 'medium', 'low'] as const).map((lvl) => (
                <div key={lvl} className="flex items-center justify-between">
                  <span className="capitalize text-muted-foreground">{lvl}</span>
                  <span className="font-medium">{vulnLevels[lvl] || 0}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <RegisterFamilySheet
        open={registerOpen}
        onOpenChange={setRegisterOpen}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add existing beneficiary to household</DialogTitle>
            <DialogDescription>
              Search by name or unique ID to attach an existing beneficiary to this household.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Search beneficiaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
              {searchTerm.trim().length < 2 && (
                <p className="p-3 text-sm text-muted-foreground">Type at least 2 characters to search.</p>
              )}
              {searchTerm.trim().length >= 2 && !isFetching && results.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No beneficiaries found.</p>
              )}
              {results.map((b) => {
                const age = calculateAge(b.date_of_birth);
                return (
                  <div key={b.id} className="flex items-center gap-3 p-3">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                      {b.display_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{b.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.unique_id || '—'}
                        {age !== null ? ` · ${age}y` : ''}
                        {b.gender ? ` · ${b.gender}` : ''}
                        {b.household_id && b.household_id !== householdId ? ' · already in another household' : ''}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddExisting(b.id)}
                      disabled={updateHousehold.isPending}
                    >
                      Add
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setAddOpen(false);
                setRegisterOpen(true);
              }}
            >
              Register a new beneficiary instead
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}