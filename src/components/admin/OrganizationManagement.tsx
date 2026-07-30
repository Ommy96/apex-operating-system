import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertTriangle, TrendingUp, Layers, Shield, X, SlidersHorizontal, UserCheck,
  Star, Crown,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const TIER_COLORS: Record<string, string> = {
  free: 'bg-muted-foreground text-muted-foreground border-border',
  starter: 'bg-info/50 text-info border-info/30',
  professional: 'bg-info/50 text-info border-info/30',
  enterprise: 'bg-warning/50 text-warning border-warning/30',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/50 text-success border-success/30',
  trial: 'bg-info/50 text-info border-info/30',
  suspended: 'bg-destructive/50 text-destructive border-destructive/30',
  cancelled: 'bg-muted-foreground text-muted-foreground border-border',
  past_due: 'bg-warning/50 text-warning border-warning/30',
};

const RISK_COLORS: Record<string, string> = {
  low: 'text-success',
  medium: 'text-warning',
  high: 'text-destructive',
};

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-muted-foreground overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{score}</span>
    </div>
  );
}

function PlanBadge({ org }: { org: OrganizationWithSubscription }) {
  if (org.is_partner) {
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
        <Crown className="h-3 w-3 mr-1" />
        Partner
      </Badge>
    );
  }
  const tier = org.subscription_tier || 'free';
  return (
    <Badge variant="outline" className={`text-xs ${TIER_COLORS[tier]}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );
}

export function OrganizationManagement() {
  const { data: organizations, isLoading } = useAllOrganizations();
  const { suspendOrganization, activateOrganization, updateSubscription, updateFeatureLimits } = useOrganizationManagement();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
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

  // Partner access state
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [partnerAction, setPartnerAction] = useState<'grant' | 'revoke'>('grant');
  const [partnerNotes, setPartnerNotes] = useState('');
  const [partnerLoading, setPartnerLoading] = useState(false);

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

  const handlePartnerAccess = async () => {
    if (!selectedOrg || !user?.id) return;
    setPartnerLoading(true);
    try {
      if (partnerAction === 'grant') {
        const { error } = await supabase.from('organizations').update({
          is_partner: true,
          subscription_tier: 'enterprise',
          plan_override: 'partner',
          partner_granted_at: new Date().toISOString(),
          partner_granted_by: user.id,
          partner_notes: partnerNotes || null,
        } as any).eq('id', selectedOrg.id);
        if (error) throw error;

        await supabase.from('partner_access_log' as any).insert({
          organization_id: selectedOrg.id,
          action: 'granted',
          performed_by: user.id,
          notes: partnerNotes || 'Partner access granted',
        });

        toast.success(`Partner access granted to ${selectedOrg.name}. They now have full access to all features.`);
      } else {
        const { error } = await supabase.from('organizations').update({
          is_partner: false,
          plan_override: null,
        } as any).eq('id', selectedOrg.id);
        if (error) throw error;

        await supabase.from('partner_access_log' as any).insert({
          organization_id: selectedOrg.id,
          action: 'revoked',
          performed_by: user.id,
          notes: partnerNotes || 'Partner access revoked',
        });

        toast.success(`Partner access revoked from ${selectedOrg.name}.`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-all-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-system-stats'] });
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setPartnerLoading(false);
      setPartnerDialogOpen(false);
      setPartnerNotes('');
      setSelectedOrg(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  const riskCounts = {
    high: organizations?.filter(o => o.risk_level === 'high').length || 0,
    medium: organizations?.filter(o => o.risk_level === 'medium').length || 0,
    low: organizations?.filter(o => o.risk_level === 'low').length || 0,
  };

  const partnerCount = organizations?.filter(o => o.is_partner).length || 0;

  return (
    <div className="space-y-4">
      {/* Partner Orgs Summary */}
      {partnerCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/20 border border-warning/30">
          <Crown className="h-4 w-4 text-warning" />
          <span className="text-xs text-warning font-medium">
            {partnerCount} Partner org{partnerCount !== 1 ? 's' : ''}:
          </span>
          <div className="flex flex-wrap gap-1">
            {organizations?.filter(o => o.is_partner).map(o => (
              <Badge key={o.id} variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
                {o.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Risk Summary Bar */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted-foreground/50 border border-border/50">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">RISK OVERVIEW</span>
        <div className="flex items-center gap-4 ml-auto">
          <button onClick={() => setFilterRisk(filterRisk === 'high' ? 'all' : 'high')} className="flex items-center gap-1.5 hover:opacity-80">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-xs text-destructive font-medium">{riskCounts.high} High</span>
          </button>
          <button onClick={() => setFilterRisk(filterRisk === 'medium' ? 'all' : 'medium')} className="flex items-center gap-1.5 hover:opacity-80">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-xs text-warning font-medium">{riskCounts.medium} Medium</span>
          </button>
          <button onClick={() => setFilterRisk(filterRisk === 'low' ? 'all' : 'low')} className="flex items-center gap-1.5 hover:opacity-80">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span className="text-xs text-success font-medium">{riskCounts.low} Low</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted-foreground/50 border-border text-muted-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-[140px] bg-muted-foreground/50 border-border text-muted-foreground">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className="bg-muted-foreground border-border">
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] bg-muted-foreground/50 border-border text-muted-foreground">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-muted-foreground border-border">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Organizations List */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted-foreground/80 border-border hover:bg-muted-foreground/80">
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Organization</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Plan</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-center">Users</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-center">Beneficiaries</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider text-center">Programs</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider w-[140px]">Health</TableHead>
              <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrgs?.map((org) => (
              <>
                <TableRow 
                  key={org.id} 
                  className="group border-border/50 hover:bg-muted-foreground/30 cursor-pointer transition-colors"
                  onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${org.risk_level === 'high' ? 'bg-destructive' : org.risk_level === 'medium' ? 'bg-warning' : 'bg-success'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">{org.name}</span>
                          {org.is_partner && (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide">
                              Partner
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {org.country && <><Globe className="h-3 w-3" />{org.country}</>}
                          {!org.country && <span>/{org.slug}</span>}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PlanBadge org={org} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[org.subscription_status || 'active']}`}>
                      {(org.subscription_status || 'active').charAt(0).toUpperCase() + (org.subscription_status || 'active').slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground font-mono">{org.member_count}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground font-mono">{org.beneficiary_count}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground font-mono">{org.program_count}</span>
                  </TableCell>
                  <TableCell>
                    <HealthBar score={org.health_score} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {expandedOrg === org.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-muted-foreground border-border">
                          <DropdownMenuLabel className="text-muted-foreground">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-muted-foreground" />
                          
                          {/* Partner Access */}
                          {org.is_partner ? (
                            <DropdownMenuItem className="text-destructive focus:bg-muted-foreground focus:text-destructive" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrg(org);
                              setPartnerAction('revoke');
                              setPartnerNotes('');
                              setPartnerDialogOpen(true);
                            }}>
                              <Crown className="h-4 w-4 mr-2" />Revoke Partner Access
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-warning focus:bg-muted-foreground focus:text-warning" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrg(org);
                              setPartnerAction('grant');
                              setPartnerNotes('');
                              setPartnerDialogOpen(true);
                            }}>
                              <Crown className="h-4 w-4 mr-2" />Grant Partner Access
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator className="bg-muted-foreground" />
                          <DropdownMenuItem className="text-muted-foreground focus:bg-muted-foreground focus:text-muted-foreground" onClick={(e) => { e.stopPropagation(); setSelectedOrg(org); setNewTier(org.subscription_tier || 'free'); setTierDialogOpen(true); }}>
                            <Settings2 className="h-4 w-4 mr-2" />Change Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-muted-foreground focus:bg-muted-foreground focus:text-muted-foreground" onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedOrg(org); 
                            setMaxUsers(String((org.features_enabled as any)?.max_users || 5));
                            setMaxBeneficiaries(String((org.features_enabled as any)?.max_beneficiaries || 100));
                            setLimitsDialogOpen(true); 
                          }}>
                            <SlidersHorizontal className="h-4 w-4 mr-2" />Adjust Limits
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-muted-foreground" />
                          <DropdownMenuItem className="text-warning focus:bg-muted-foreground focus:text-warning" onClick={(e) => {
                            e.stopPropagation();
                            sessionStorage.setItem('impersonating_org', JSON.stringify({ orgId: org.id, orgName: org.name }));
                            navigate('/dashboard');
                          }}>
                            <UserCheck className="h-4 w-4 mr-2" />Impersonate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-muted-foreground" />
                          {org.suspended_at ? (
                            <DropdownMenuItem className="text-success focus:bg-muted-foreground focus:text-success" onClick={(e) => { e.stopPropagation(); handleActivate(org); }}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />Reactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-destructive focus:bg-muted-foreground focus:text-destructive" onClick={(e) => { e.stopPropagation(); setSelectedOrg(org); setSuspendDialogOpen(true); }}>
                              <Ban className="h-4 w-4 mr-2" />Suspend
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedOrg === org.id && (
                  <TableRow key={`${org.id}-detail`} className="border-border/50 bg-muted-foreground/20">
                    <TableCell colSpan={8} className="p-0">
                      <OrgDetailPanel org={org} />
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
            {(!filteredOrgs || filteredOrgs.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No organizations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {filteredOrgs?.length || 0} of {organizations?.length || 0} tenants</span>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="bg-muted-foreground border-border text-muted-foreground">
          <DialogHeader>
            <DialogTitle className="text-muted-foreground">Suspend Organization</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will prevent all users from accessing {selectedOrg?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="bg-muted-foreground/50 border-border text-muted-foreground"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} className="border-border text-muted-foreground">Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!suspendReason || suspendOrganization.isPending}>
              {suspendOrganization.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent className="bg-muted-foreground border-border text-muted-foreground">
          <DialogHeader>
            <DialogTitle className="text-muted-foreground">Change Subscription Plan</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update plan for {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <Select value={newTier} onValueChange={setNewTier}>
            <SelectTrigger className="bg-muted-foreground/50 border-border text-muted-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-muted-foreground border-border">
              <SelectItem value="free">Free — $0/mo</SelectItem>
              <SelectItem value="starter">Starter — $29/mo</SelectItem>
              <SelectItem value="professional">Professional — $99/mo</SelectItem>
              <SelectItem value="enterprise">Enterprise — $299/mo</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)} className="border-border text-muted-foreground">Cancel</Button>
            <Button onClick={handleUpdateTier} disabled={!newTier || updateSubscription.isPending} className="bg-warning hover:bg-warning text-white">
              {updateSubscription.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limits Dialog */}
      <Dialog open={limitsDialogOpen} onOpenChange={setLimitsDialogOpen}>
        <DialogContent className="bg-muted-foreground border-border text-muted-foreground">
          <DialogHeader>
            <DialogTitle className="text-muted-foreground">Adjust Limits</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set usage limits for {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Max Users</label>
              <Input type="number" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} className="bg-muted-foreground/50 border-border text-muted-foreground" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Max Beneficiaries</label>
              <Input type="number" value={maxBeneficiaries} onChange={(e) => setMaxBeneficiaries(e.target.value)} className="bg-muted-foreground/50 border-border text-muted-foreground" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitsDialogOpen(false)} className="border-border text-muted-foreground">Cancel</Button>
            <Button onClick={handleUpdateLimits} disabled={updateFeatureLimits.isPending} className="bg-warning hover:bg-warning text-white">
              {updateFeatureLimits.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Limits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partner Access Dialog */}
      <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
        <DialogContent className="bg-muted-foreground border-border text-muted-foreground">
          <DialogHeader>
            <DialogTitle className="text-muted-foreground flex items-center gap-2">
              <Crown className="h-5 w-5 text-warning" />
              {partnerAction === 'grant' ? `Grant Partner Access to ${selectedOrg?.name}?` : `Revoke partner access from ${selectedOrg?.name}?`}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {partnerAction === 'grant'
                ? `This gives ${selectedOrg?.name} unlimited access to ALL features on the platform, regardless of their subscription plan. This is intended for design partners and pilot organisations.`
                : `This will revert ${selectedOrg?.name} to their paid subscription plan. Features not included in their plan will be locked.`}
            </DialogDescription>
          </DialogHeader>
          {partnerAction === 'grant' && (
            <div className="space-y-2 py-2">
              <label className="text-sm text-muted-foreground">Add a note about why partner access is being granted (optional)</label>
              <Textarea
                placeholder="e.g. Design partner — 6 month pilot"
                value={partnerNotes}
                onChange={(e) => setPartnerNotes(e.target.value)}
                className="bg-muted-foreground/50 border-border text-muted-foreground"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnerDialogOpen(false)} className="border-border text-muted-foreground">
              Cancel
            </Button>
            {partnerAction === 'grant' ? (
              <Button onClick={handlePartnerAccess} disabled={partnerLoading} className="bg-warning hover:bg-warning text-white">
                {partnerLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Grant Access
              </Button>
            ) : (
              <Button onClick={handlePartnerAccess} disabled={partnerLoading} variant="destructive">
                {partnerLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Revoke Access
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrgDetailPanel({ org }: { org: OrganizationWithSubscription }) {
  const features = org.features_enabled as Record<string, any> || {};
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted-foreground/50">
      {/* Organization Info */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization Details</h4>
        <div className="space-y-2">
          <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Type" value={org.organization_type || 'Not set'} />
          <InfoRow icon={<Globe className="h-3.5 w-3.5" />} label="Country" value={org.country || 'Not set'} />
          <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="County" value={org.county || 'Not set'} />
          <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Created" value={format(new Date(org.created_at), 'MMM d, yyyy')} />
          <InfoRow icon={<Activity className="h-3.5 w-3.5" />} label="Last Activity" value={org.last_activity ? formatDistanceToNow(new Date(org.last_activity), { addSuffix: true }) : 'No activity'} />
        </div>

        {/* Partner Info */}
        {org.is_partner && (
          <div className="mt-3 p-3 rounded-lg bg-warning/20 border border-warning/30">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-warning" />
              <span className="text-xs font-semibold text-warning uppercase tracking-wide">Partner Access</span>
            </div>
            {org.partner_granted_at && (
              <p className="text-xs text-warning">Granted {format(new Date(org.partner_granted_at), 'MMM d, yyyy')}</p>
            )}
            {org.partner_notes && (
              <p className="text-xs text-muted-foreground mt-1">{org.partner_notes}</p>
            )}
          </div>
        )}
      </div>

      {/* Usage & Limits */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usage & Limits</h4>
        <div className="space-y-3">
          <UsageRow label="Users" current={org.member_count} max={org.is_partner ? null : (features.max_users || 5)} />
          <UsageRow label="Beneficiaries" current={org.beneficiary_count} max={org.is_partner ? null : (features.max_beneficiaries || 100)} />
          <UsageRow label="Programs" current={org.program_count} max={null} />
        </div>
      </div>

      {/* Status & Health */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Health & Risk</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Health Score</span>
            <span className={`text-sm font-bold ${org.health_score >= 70 ? 'text-success' : org.health_score >= 40 ? 'text-warning' : 'text-destructive'}`}>
              {org.health_score}/100
            </span>
          </div>
          <HealthBar score={org.health_score} />
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">Risk Level</span>
            <div className={`flex items-center gap-1 ${RISK_COLORS[org.risk_level]}`}>
              {org.risk_level === 'high' && <AlertTriangle className="h-3.5 w-3.5" />}
              <span className="text-sm font-medium capitalize">{org.risk_level}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Onboarding</span>
            <Badge variant="outline" className={org.onboarding_completed ? 'border-success/30 text-success text-xs' : 'border-border text-muted-foreground text-xs'}>
              {org.onboarding_completed ? 'Complete' : 'Pending'}
            </Badge>
          </div>

          {org.suspended_at && (
            <div className="mt-2 p-2 rounded bg-destructive/20 border border-destructive/30">
              <p className="text-xs text-destructive">
                <strong>Suspended:</strong> {org.suspended_reason || 'No reason provided'}
              </p>
              <p className="text-xs text-destructive mt-1">
                {format(new Date(org.suspended_at), 'MMM d, yyyy')}
              </p>
            </div>
          )}

          {/* Feature Flags Summary */}
          <div className="mt-2 flex flex-wrap gap-1">
            {org.is_partner && <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">Full Access</Badge>}
            {features.reports_enabled && <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">Reports</Badge>}
            {features.indicators_enabled && <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">Indicators</Badge>}
            {features.custom_entities && <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">Custom Entities</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground w-20">{label}</span>
      <span className="text-muted-foreground truncate">{value}</span>
    </div>
  );
}

function UsageRow({ label, current, max }: { label: string; current: number; max: number | null }) {
  const pct = max ? Math.min(100, (current / max) * 100) : 0;
  const isOverLimit = max ? current >= max : false;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-mono ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
          {current}{max ? ` / ${max}` : ' (∞)'}
        </span>
      </div>
      {max && (
        <div className="h-1.5 rounded-full bg-muted-foreground overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-destructive' : pct > 80 ? 'bg-warning' : 'bg-success'}`} 
            style={{ width: `${pct}%` }} 
          />
        </div>
      )}
    </div>
  );
}
