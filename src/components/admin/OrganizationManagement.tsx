import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  useAllOrganizations, 
  useOrganizationManagement,
  OrganizationWithSubscription 
} from '@/hooks/useSystemAdmin';
import { 
  Building2, 
  Search, 
  MoreHorizontal, 
  Ban, 
  CheckCircle2,
  Users,
  Heart,
  Loader2,
  Settings2,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

const TIER_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  starter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  professional: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  enterprise: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  past_due: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

export function OrganizationManagement() {
  const { data: organizations, isLoading } = useAllOrganizations();
  const { suspendOrganization, activateOrganization, updateSubscription } = useOrganizationManagement();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithSubscription | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [newTier, setNewTier] = useState('');

  const filteredOrgs = organizations?.filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (org.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTier = filterTier === 'all' || org.subscription_tier === filterTier;
    const matchesStatus = filterStatus === 'all' || org.subscription_status === filterStatus;
    return matchesSearch && matchesTier && matchesStatus;
  });

  const handleSuspend = () => {
    if (selectedOrg && suspendReason) {
      suspendOrganization.mutate({ orgId: selectedOrg.id, reason: suspendReason });
      setSuspendDialogOpen(false);
      setSuspendReason('');
      setSelectedOrg(null);
    }
  };

  const handleActivate = (org: OrganizationWithSubscription) => {
    activateOrganization.mutate(org.id);
  };

  const handleUpdateTier = () => {
    if (selectedOrg && newTier) {
      updateSubscription.mutate({ orgId: selectedOrg.id, tier: newTier });
      setTierDialogOpen(false);
      setNewTier('');
      setSelectedOrg(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Organization Management
              </CardTitle>
              <CardDescription>View and manage all organizations on the platform</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Organizations Table */}
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Organization</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Members</TableHead>
                  <TableHead className="text-center">Beneficiaries</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs?.map((org) => (
                  <TableRow key={org.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-muted-foreground">/{org.slug}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={TIER_COLORS[org.subscription_tier || 'free']}>
                        {(org.subscription_tier || 'free').charAt(0).toUpperCase() + (org.subscription_tier || 'free').slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[org.subscription_status || 'active']}>
                        {(org.subscription_status || 'active').charAt(0).toUpperCase() + (org.subscription_status || 'active').slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {org.member_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        {org.beneficiary_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.onboarding_completed ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(org.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setSelectedOrg(org); setNewTier(org.subscription_tier || 'free'); setTierDialogOpen(true); }}>
                            <Settings2 className="h-4 w-4 mr-2" />
                            Change Tier
                          </DropdownMenuItem>
                          {org.suspended_at ? (
                            <DropdownMenuItem onClick={() => handleActivate(org)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => { setSelectedOrg(org); setSuspendDialogOpen(true); }}
                              className="text-destructive"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredOrgs || filteredOrgs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No organizations found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Organization</DialogTitle>
            <DialogDescription>
              This will prevent all users from accessing {selectedOrg?.name}. They will see a suspension notice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for suspension</label>
              <Textarea
                placeholder="Enter the reason for suspension..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleSuspend}
              disabled={!suspendReason || suspendOrganization.isPending}
            >
              {suspendOrganization.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Suspend Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Tier</DialogTitle>
            <DialogDescription>
              Update the subscription tier for {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subscription Tier</label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateTier}
              disabled={!newTier || updateSubscription.isPending}
            >
              {updateSubscription.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
