import { useState, useMemo } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/workspace/PaginationControls';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Download, DollarSign, Users, TrendingUp, Heart, ArrowUpDown, ChevronDown, ChevronUp, UserPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageHeroHeader } from '@/components/PageHeroHeader';
import { toast } from 'sonner';

interface DonorRecord {
  id: string;
  donor_name: string;
  amount_received: number | null;
  donation_date: string | null;
  notes: string | null;
  program_id: string | null;
  beneficiary_id: string;
  created_at: string;
  beneficiaries: { id: string; display_name: string } | null;
  programs: { id: string; name: string } | null;
}

interface AggregatedDonor {
  name: string;
  totalAmount: number;
  donationCount: number;
  beneficiaryCount: number;
  programCount: number;
  lastDonation: string | null;
  programs: string[];
  records: DonorRecord[];
}

export default function DonorManagement() {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'totalAmount' | 'donationCount' | 'lastDonation'>('totalAmount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedDonor, setSelectedDonor] = useState<AggregatedDonor | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountPhone, setAccountPhone] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  // Fetch existing donor accounts to show status
  const { data: donorAccounts } = useQuery({
    queryKey: ['donor-accounts-list', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donor_accounts')
        .select('id, donor_name, email, is_active')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const donorAccountMap = useMemo(() => {
    const map = new Map<string, { email: string; isActive: boolean }>();
    donorAccounts?.forEach(a => {
      map.set(a.donor_name.trim().toLowerCase(), { email: a.email, isActive: a.is_active });
    });
    return map;
  }, [donorAccounts]);

  const handleCreateDonorAccount = async () => {
    if (!selectedDonor || !orgId || !accountEmail || !accountPassword) return;
    setCreatingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-donor-account', {
        body: {
          email: accountEmail,
          password: accountPassword,
          donor_name: selectedDonor.name,
          phone: accountPhone || undefined,
          organization_id: orgId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Portal account created for ${selectedDonor.name}`);
      setShowCreateAccount(false);
      setAccountEmail('');
      setAccountPassword('');
      setAccountPhone('');
      queryClient.invalidateQueries({ queryKey: ['donor-accounts-list'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create donor account');
    } finally {
      setCreatingAccount(false);
    }
  };

  const { data: donorRecords, isLoading } = useQuery({
    queryKey: ['all-donors', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_donors')
        .select('id, donor_name, amount_received, donation_date, notes, program_id, beneficiary_id, created_at, beneficiaries(id, display_name), programs(id, name)')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DonorRecord[];
    },
    enabled: !!orgId,
  });

  const { data: programs } = useQuery({
    queryKey: ['programs-for-donor-filter', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Aggregate donors by name
  const aggregatedDonors = useMemo(() => {
    if (!donorRecords) return [];
    const map = new Map<string, AggregatedDonor>();

    for (const r of donorRecords) {
      const key = r.donor_name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: r.donor_name,
          totalAmount: 0,
          donationCount: 0,
          beneficiaryCount: 0,
          programCount: 0,
          lastDonation: null,
          programs: [],
          records: [],
        });
      }
      const agg = map.get(key)!;
      agg.totalAmount += r.amount_received || 0;
      agg.donationCount += 1;
      agg.records.push(r);
      if (r.donation_date && (!agg.lastDonation || r.donation_date > agg.lastDonation)) {
        agg.lastDonation = r.donation_date;
      }
      if (r.programs?.name && !agg.programs.includes(r.programs.name)) {
        agg.programs.push(r.programs.name);
      }
    }

    // Calculate unique beneficiaries and programs per donor
    for (const agg of map.values()) {
      const uniqueBeneficiaries = new Set(agg.records.map(r => r.beneficiary_id));
      const uniquePrograms = new Set(agg.records.filter(r => r.program_id).map(r => r.program_id));
      agg.beneficiaryCount = uniqueBeneficiaries.size;
      agg.programCount = uniquePrograms.size;
    }

    return Array.from(map.values());
  }, [donorRecords]);

  // Filter and sort
  const filteredDonors = useMemo(() => {
    let result = aggregatedDonors;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(term));
    }

    if (programFilter !== 'all') {
      result = result.filter(d =>
        d.records.some(r => r.program_id === programFilter)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'totalAmount') cmp = a.totalAmount - b.totalAmount;
      else if (sortField === 'donationCount') cmp = a.donationCount - b.donationCount;
      else if (sortField === 'lastDonation') cmp = (a.lastDonation || '').localeCompare(b.lastDonation || '');
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [aggregatedDonors, search, programFilter, sortField, sortDir]);

  const donorPagination = usePagination(filteredDonors, { initialPageSize: 25 });

  const totalDonations = aggregatedDonors.reduce((s, d) => s + d.totalAmount, 0);
  const totalDonors = aggregatedDonors.length;
  const totalContributions = donorRecords?.length || 0;

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'desc' ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronUp className="h-3 w-3 ml-1" />;
  };

  const exportCSV = () => {
    const headers = ['Donor Name', 'Total Amount (KES)', 'Contributions', 'Beneficiaries', 'Programs', 'Last Donation'];
    const rows = filteredDonors.map(d => [
      d.name,
      d.totalAmount.toFixed(2),
      d.donationCount,
      d.beneficiaryCount,
      d.programs.join('; '),
      d.lastDonation ? format(new Date(d.lastDonation), 'yyyy-MM-dd') : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donors-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeroHeader
        title="Donor Management"
        description="Track all donors, contributions, and program sponsorships across your organization"
        icon={Heart}
        iconColorClass="text-rose-500"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Donors</p>
              <p className="text-xl font-bold">{totalDonors}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Contributions</p>
              <p className="text-xl font-bold">KES {totalDonations.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Transactions</p>
              <p className="text-xl font-bold">{totalContributions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search donors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs?.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={exportCSV} title="Export CSV">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Donor Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading donors...</div>
          ) : filteredDonors.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Heart className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No donors found</p>
              <p className="text-xs mt-1">Donors are added via beneficiary profiles under the Programs tab</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                      <span className="flex items-center">Donor Name <SortIcon field="name" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('totalAmount')}>
                      <span className="flex items-center justify-end">Total (KES) <SortIcon field="totalAmount" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-center" onClick={() => toggleSort('donationCount')}>
                      <span className="flex items-center justify-center">Contributions <SortIcon field="donationCount" /></span>
                    </TableHead>
                    <TableHead className="text-center">Beneficiaries</TableHead>
                    <TableHead>Programs</TableHead>
                    <TableHead className="text-center">Portal</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('lastDonation')}>
                      <span className="flex items-center">Last Donation <SortIcon field="lastDonation" /></span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donorPagination.paginatedItems.map(donor => (
                    <TableRow
                      key={donor.name}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDonor(donor)}
                    >
                      <TableCell className="font-medium">{donor.name}</TableCell>
                      <TableCell className="text-right font-semibold">{donor.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{donor.donationCount}</TableCell>
                      <TableCell className="text-center">{donor.beneficiaryCount}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {donor.programs.slice(0, 2).map(p => (
                            <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                          ))}
                          {donor.programs.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{donor.programs.length - 2}</Badge>
                          )}
                          {donor.programs.length === 0 && <span className="text-xs text-muted-foreground">General</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {donor.lastDonation ? format(new Date(donor.lastDonation), 'MMM dd, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {donorAccountMap.has(donor.name.trim().toLowerCase()) ? (
                          <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">No Account</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <PaginationControls
            currentPage={donorPagination.currentPage}
            totalPages={donorPagination.totalPages}
            totalItems={donorPagination.totalItems}
            startIndex={donorPagination.startIndex}
            endIndex={donorPagination.endIndex}
            pageSize={donorPagination.pageSize}
            pageSizeOptions={donorPagination.pageSizeOptions}
            canGoNext={donorPagination.canGoNext}
            canGoPrevious={donorPagination.canGoPrevious}
            onPageChange={donorPagination.setCurrentPage}
            onPageSizeChange={donorPagination.setPageSize}
            onFirst={donorPagination.goToFirstPage}
            onLast={donorPagination.goToLastPage}
            onNext={donorPagination.goToNextPage}
            onPrevious={donorPagination.goToPreviousPage}
          />
        </CardContent>
      </Card>

      {/* Donor Detail Dialog */}
      <Dialog open={!!selectedDonor} onOpenChange={(open) => { if (!open) { setSelectedDonor(null); setShowCreateAccount(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              {selectedDonor?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedDonor && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">KES {selectedDonor.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Given</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{selectedDonor.beneficiaryCount}</p>
                  <p className="text-xs text-muted-foreground">Beneficiaries</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{selectedDonor.programCount}</p>
                  <p className="text-xs text-muted-foreground">Programs</p>
                </div>
              </div>

              <Separator />

              {/* Portal Account Section */}
              {(() => {
                const acct = donorAccountMap.get(selectedDonor.name.trim().toLowerCase());
                if (acct) {
                  return (
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium">Portal Account Active</span>
                        <span className="text-muted-foreground ml-2">({acct.email})</span>
                      </div>
                    </div>
                  );
                }
                if (!showCreateAccount) {
                  return (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowCreateAccount(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Portal Account
                    </Button>
                  );
                }
                return (
                  <div className="space-y-3 p-3 border rounded-lg">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <UserPlus className="h-4 w-4" /> Create Portal Account for {selectedDonor.name}
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Email *</Label>
                        <Input
                          type="email"
                          placeholder="donor@example.com"
                          value={accountEmail}
                          onChange={e => setAccountEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Password *</Label>
                        <Input
                          type="password"
                          placeholder="Minimum 6 characters"
                          value={accountPassword}
                          onChange={e => setAccountPassword(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Phone (optional)</Label>
                        <Input
                          type="tel"
                          placeholder="+254..."
                          value={accountPhone}
                          onChange={e => setAccountPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateDonorAccount}
                        disabled={creatingAccount || !accountEmail || !accountPassword}
                      >
                        {creatingAccount && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Create Account
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowCreateAccount(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                );
              })()}

              <Separator />

              <div>
                <h4 className="text-sm font-semibold mb-2">Contribution History</h4>
                <ScrollArea className="max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDonor.records.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">
                            {r.donation_date ? format(new Date(r.donation_date), 'MMM dd, yyyy') : '—'}
                          </TableCell>
                          <TableCell>
                            <button
                              className="text-sm text-primary hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/beneficiaries/${r.beneficiary_id}`);
                              }}
                            >
                              {r.beneficiaries?.display_name || 'Unknown'}
                            </button>
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.programs?.name || <span className="text-muted-foreground">General</span>}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {(r.amount_received || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
