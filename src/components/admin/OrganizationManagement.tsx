import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { 
  useAllOrganizations, useOrganizationManagement, OrganizationWithSubscription 
} from '@/hooks/useSystemAdmin';
import { 
  Building2, Search, MoreHorizontal, Ban, CheckCircle2, Users, Heart, Loader2, 
  Settings2, ChevronDown, ChevronUp, Globe, MapPin, Calendar, Activity,
  AlertTriangle, TrendingUp, Layers, Shield, X, SlidersHorizontal,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';

const TIER_COLORS: Record<string, string> = {
  free: 'bg-slate-700 text-slate-300 border-slate-600',
  starter: 'bg-blue-900/50 text-blue-300 border-blue-700',
  professional: 'bg-purple-900/50 text-purple-300 border-purple-700',
  enterprise: 'bg-amber-900/50 text-amber-300 border-amber-700',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  trial: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
  suspended: 'bg-red-900/50 text-red-300 border-red-700',
  cancelled: 'bg-slate-700 text-slate-400 border-slate-600',
  past_due: 'bg-orange-900/50 text-orange-300 border-orange-700',
};

const RISK_COLORS: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
};

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{score}</span>
    </div>
  );
}

export function OrganizationManagement() {
  const { data: organizations, isLoading } = useAllOrganizations();
  const { suspendOrganization, activateOrganization, updateSubscription, updateFeatureLimits } = useOrganizationManagement();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithSubscription | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [newTier, setNewTier] = useState('');

  const [limitsDialogOpen, setLimitsDialogOpen] = useState(false);
  const [maxUsers, setMaxUsers] = useState('');
  const [maxBeneficiaries, setMaxBeneficiaries] = useState('');

  const filteredOrgs = organizations?.filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (org.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTier = filterTier === 'all' || org.subscription_tier === filterTier;
    const matchesStatus = filterStatus === 'all' || org.subscription_status === filterStatus;
    const matchesRisk = filterRisk === 'all' || org.risk_level === filterRisk;
    return matchesSearch && matchesTier && matchesStatus && matchesRisk;
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

  const handleUpdateLimits = () => {
    if (selectedOrg) {
      const features: Record<string, unknown> = {};
      if (maxUsers) features.max_users = parseInt(maxUsers);
      if (maxBeneficiaries) features.max_beneficiaries = parseInt(maxBeneficiaries);
      updateFeatureLimits.mutate({ orgId: selectedOrg.id, features });
      setLimitsDialogOpen(false);
      setMaxUsers('');
      setMaxBeneficiaries('');
      setSelectedOrg(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const riskCounts = {
    high: organizations?.filter(o => o.risk_level === 'high').length || 0,
    medium: organizations?.filter(o => o.risk_level === 'medium').length || 0,
    low: organizations?.filter(o => o.risk_level === 'low').length || 0,
  };

  return (
    <div className="space-y-4">
      {/* Risk Summary Bar */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <Shield className="h-4 w-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">RISK OVERVIEW</span>
        <div className="flex items-center gap-4 ml-auto">
          <button onClick={() => setFilterRisk(filterRisk === 'high' ? 'all' : 'high')} className="flex items-center gap-1.5 hover:opacity-80">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-red-400 font-medium">{riskCounts.high} High</span>
          </button>
          <button onClick={() => setFilterRisk(filterRisk === 'medium' ? 'all' : 'medium')} className="flex items-center gap-1.5 hover:opacity-80">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs text-amber-400 font-medium">{riskCounts.medium} Medium</span>
          </button>
          <button onClick={() => setFilterRisk(filterRisk === 'low' ? 'all' : 'low')} className="flex items-center gap-1.5 hover:opacity-80">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-400 font-medium">{riskCounts.low} Low</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-700 text-slate-300">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-700 text-slate-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Organizations List */}
      <div className="rounded-lg border border-slate-700/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/80 border-slate-700 hover:bg-slate-800/80">
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Organization</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Plan</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider text-center">Users</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider text-center">Beneficiaries</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider text-center">Programs</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider w-[140px]">Health</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wider w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrgs?.map((org) => (
              <>
                <TableRow 
                  key={org.id} 
                  className="group border-slate-700/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
                  onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${org.risk_level === 'high' ? 'bg-red-500' : org.risk_level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <div>
                        <div className="font-medium text-slate-200">{org.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          {org.country && <><Globe className="h-3 w-3" />{org.country}</>}
                          {!org.country && <span>/{org.slug}</span>}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${TIER_COLORS[org.subscription_tier || 'free']}`}>
                      {(org.subscription_tier || 'free').charAt(0).toUpperCase() + (org.subscription_tier || 'free').slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[org.subscription_status || 'active']}`}>
                      {(org.subscription_status || 'active').charAt(0).toUpperCase() + (org.subscription_status || 'active').slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-slate-300 font-mono">{org.member_count}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-slate-300 font-mono">{org.beneficiary_count}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-slate-300 font-mono">{org.program_count}</span>
                  </TableCell>
                  <TableCell>
                    <HealthBar score={org.health_score} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {expandedOrg === org.id ? (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-200">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuLabel className="text-slate-400">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem className="text-slate-300 focus:bg-slate-700 focus:text-slate-200" onClick={(e) => { e.stopPropagation(); setSelectedOrg(org); setNewTier(org.subscription_tier || 'free'); setTierDialogOpen(true); }}>
                            <Settings2 className="h-4 w-4 mr-2" />Change Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-slate-300 focus:bg-slate-700 focus:text-slate-200" onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedOrg(org); 
                            setMaxUsers(String((org.features_enabled as any)?.max_users || 5));
                            setMaxBeneficiaries(String((org.features_enabled as any)?.max_beneficiaries || 100));
                            setLimitsDialogOpen(true); 
                          }}>
                            <SlidersHorizontal className="h-4 w-4 mr-2" />Adjust Limits
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          {org.suspended_at ? (
                            <DropdownMenuItem className="text-emerald-400 focus:bg-slate-700 focus:text-emerald-300" onClick={(e) => { e.stopPropagation(); handleActivate(org); }}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />Reactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-red-400 focus:bg-slate-700 focus:text-red-300" onClick={(e) => { e.stopPropagation(); setSelectedOrg(org); setSuspendDialogOpen(true); }}>
                              <Ban className="h-4 w-4 mr-2" />Suspend
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
                {/* Expanded Detail Row */}
                {expandedOrg === org.id && (
                  <TableRow key={`${org.id}-detail`} className="border-slate-700/50 bg-slate-800/20">
                    <TableCell colSpan={8} className="p-0">
                      <OrgDetailPanel org={org} />
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
            {(!filteredOrgs || filteredOrgs.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  No organizations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Showing {filteredOrgs?.length || 0} of {organizations?.length || 0} tenants</span>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Suspend Organization</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will prevent all users from accessing {selectedOrg?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-slate-200"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} className="border-slate-600 text-slate-300">Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!suspendReason || suspendOrganization.isPending}>
              {suspendOrganization.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Change Subscription Plan</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update plan for {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <Select value={newTier} onValueChange={setNewTier}>
            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="free">Free — $0/mo</SelectItem>
              <SelectItem value="starter">Starter — $29/mo</SelectItem>
              <SelectItem value="professional">Professional — $99/mo</SelectItem>
              <SelectItem value="enterprise">Enterprise — $299/mo</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)} className="border-slate-600 text-slate-300">Cancel</Button>
            <Button onClick={handleUpdateTier} disabled={!newTier || updateSubscription.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
              {updateSubscription.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limits Dialog */}
      <Dialog open={limitsDialogOpen} onOpenChange={setLimitsDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Adjust Limits</DialogTitle>
            <DialogDescription className="text-slate-400">
              Set usage limits for {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Max Users</label>
              <Input type="number" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} className="bg-slate-700/50 border-slate-600 text-slate-200" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Max Beneficiaries</label>
              <Input type="number" value={maxBeneficiaries} onChange={(e) => setMaxBeneficiaries(e.target.value)} className="bg-slate-700/50 border-slate-600 text-slate-200" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitsDialogOpen(false)} className="border-slate-600 text-slate-300">Cancel</Button>
            <Button onClick={handleUpdateLimits} disabled={updateFeatureLimits.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
              {updateFeatureLimits.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Limits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrgDetailPanel({ org }: { org: OrganizationWithSubscription }) {
  const features = org.features_enabled as Record<string, any> || {};
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-850/50">
      {/* Organization Info */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Organization Details</h4>
        <div className="space-y-2">
          <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Type" value={org.organization_type || 'Not set'} />
          <InfoRow icon={<Globe className="h-3.5 w-3.5" />} label="Country" value={org.country || 'Not set'} />
          <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="County" value={org.county || 'Not set'} />
          <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Created" value={format(new Date(org.created_at), 'MMM d, yyyy')} />
          <InfoRow icon={<Activity className="h-3.5 w-3.5" />} label="Last Activity" value={org.last_activity ? formatDistanceToNow(new Date(org.last_activity), { addSuffix: true }) : 'No activity'} />
        </div>
      </div>

      {/* Usage & Limits */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Usage & Limits</h4>
        <div className="space-y-3">
          <UsageRow label="Users" current={org.member_count} max={features.max_users || 5} />
          <UsageRow label="Beneficiaries" current={org.beneficiary_count} max={features.max_beneficiaries || 100} />
          <UsageRow label="Programs" current={org.program_count} max={null} />
        </div>
      </div>

      {/* Status & Health */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Health & Risk</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Health Score</span>
            <span className={`text-sm font-bold ${org.health_score >= 70 ? 'text-emerald-400' : org.health_score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {org.health_score}/100
            </span>
          </div>
          <HealthBar score={org.health_score} />
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">Risk Level</span>
            <div className={`flex items-center gap-1 ${RISK_COLORS[org.risk_level]}`}>
              {org.risk_level === 'high' && <AlertTriangle className="h-3.5 w-3.5" />}
              <span className="text-sm font-medium capitalize">{org.risk_level}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Onboarding</span>
            <Badge variant="outline" className={org.onboarding_completed ? 'border-emerald-700 text-emerald-400 text-xs' : 'border-slate-600 text-slate-400 text-xs'}>
              {org.onboarding_completed ? 'Complete' : 'Pending'}
            </Badge>
          </div>

          {org.suspended_at && (
            <div className="mt-2 p-2 rounded bg-red-900/20 border border-red-800/30">
              <p className="text-xs text-red-400">
                <strong>Suspended:</strong> {org.suspended_reason || 'No reason provided'}
              </p>
              <p className="text-xs text-red-500 mt-1">
                {format(new Date(org.suspended_at), 'MMM d, yyyy')}
              </p>
            </div>
          )}

          {/* Feature Flags Summary */}
          <div className="mt-2 flex flex-wrap gap-1">
            {features.reports_enabled && <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">Reports</Badge>}
            {features.indicators_enabled && <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">Indicators</Badge>}
            {features.custom_entities && <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">Custom Entities</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">{icon}</span>
      <span className="text-slate-400 w-20">{label}</span>
      <span className="text-slate-200 truncate">{value}</span>
    </div>
  );
}

function UsageRow({ label, current, max }: { label: string; current: number; max: number | null }) {
  const pct = max ? Math.min(100, (current / max) * 100) : 0;
  const isOverLimit = max ? current >= max : false;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-xs font-mono ${isOverLimit ? 'text-red-400' : 'text-slate-300'}`}>
          {current}{max ? ` / ${max}` : ''}
        </span>
      </div>
      {max && (
        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
            style={{ width: `${pct}%` }} 
          />
        </div>
      )}
    </div>
  );
}
