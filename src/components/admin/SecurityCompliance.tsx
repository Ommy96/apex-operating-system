import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGlobalAuditLogs, useAllOrganizations, useAllUsers } from '@/hooks/useSystemAdmin';
import {
  Shield, Search, Loader2, AlertTriangle, Lock, Eye, UserX, FileWarning,
  Activity, ShieldAlert, CheckCircle2, XCircle, Clock, Filter, Download,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

function ComplianceCard({ title, value, status, icon: Icon, description }: {
  title: string; value: number; status: 'ok' | 'warning' | 'danger'; icon: any; description: string;
}) {
  const statusStyles = {
    ok: 'border-emerald-500/20 from-emerald-500/10 to-emerald-600/5',
    warning: 'border-amber-500/20 from-amber-500/10 to-amber-600/5',
    danger: 'border-red-500/20 from-red-500/10 to-red-600/5',
  };
  const iconStyles = {
    ok: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
  };
  return (
    <div className={`p-4 rounded-lg bg-gradient-to-br border ${statusStyles[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`h-5 w-5 ${iconStyles[status]}`} />
        {status === 'ok' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        {status === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400" />}
        {status === 'danger' && <XCircle className="h-4 w-4 text-red-400" />}
      </div>
      <div className="text-2xl font-bold text-slate-100 font-mono">{value}</div>
      <h4 className="text-sm font-medium text-slate-200 mt-1">{title}</h4>
      <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
    </div>
  );
}

export function SecurityCompliance() {
  const { data: organizations, isLoading: orgsLoading } = useAllOrganizations();
  const { data: users, isLoading: usersLoading } = useAllUsers();
  const { data: auditLogs, isLoading: logsLoading } = useGlobalAuditLogs({ limit: 500 });

  const [activeSection, setActiveSection] = useState<'overview' | 'suspicious' | 'compliance' | 'exports'>('overview');

  const isLoading = orgsLoading || usersLoading || logsLoading;

  // Compliance computations
  const complianceMetrics = useMemo(() => {
    if (!organizations || !users) return null;

    // Inactive users with active org access (no activity in 90+ days)
    const inactiveUsersWithAccess = users.filter(u => {
      if (!u.organizations.length) return false;
      // We don't have last_sign_in - approximate via created_at
      return true; // In real implementation, check last_sign_in_at
    });

    // Orgs without recent activity (60+ days)
    const staleOrgs = organizations.filter(org => {
      if (!org.last_activity) return true;
      return differenceInDays(new Date(), new Date(org.last_activity)) > 60;
    });

    // Suspended but not deactivated
    const suspendedOrgs = organizations.filter(o => o.suspended_at);

    // Orgs on free tier with significant data
    const overusingFreeOrgs = organizations.filter(
      o => o.subscription_tier === 'free' && (o.beneficiary_count > 50 || o.member_count > 5)
    );

    // Role changes (security-sensitive events)
    const roleChanges = auditLogs?.filter(l =>
      ['role_change', 'role_granted', 'role_revoked'].includes(l.event_type)
    ) || [];

    // Data export events
    const dataExports = auditLogs?.filter(l =>
      l.event_type?.includes('export') || l.event_type?.includes('download')
    ) || [];

    // Permission changes
    const permissionChanges = auditLogs?.filter(l =>
      l.entity_type?.includes('rbac') || l.event_type?.includes('permission')
    ) || [];

    // Deletion events
    const deletionEvents = auditLogs?.filter(l => l.event_type === 'deleted') || [];

    return {
      staleOrgs,
      suspendedOrgs,
      overusingFreeOrgs,
      inactiveUsersWithAccess,
      roleChanges,
      dataExports,
      permissionChanges,
      deletionEvents,
      totalSecurityEvents: roleChanges.length + permissionChanges.length + deletionEvents.length,
    };
  }, [organizations, users, auditLogs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <Shield className="h-4 w-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">SECURITY & COMPLIANCE OVERSIGHT</span>
        <div className="ml-auto flex gap-2">
          {['overview', 'suspicious', 'compliance', 'exports'].map(s => (
            <Button
              key={s}
              size="sm"
              variant={activeSection === s ? 'default' : 'ghost'}
              onClick={() => setActiveSection(s as any)}
              className={`text-xs h-7 ${activeSection === s
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Compliance Overview Cards */}
      {activeSection === 'overview' && complianceMetrics && (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <ComplianceCard
              title="Stale Organizations"
              value={complianceMetrics.staleOrgs.length}
              status={complianceMetrics.staleOrgs.length > 5 ? 'danger' : complianceMetrics.staleOrgs.length > 0 ? 'warning' : 'ok'}
              icon={Clock}
              description="No activity in 60+ days"
            />
            <ComplianceCard
              title="Suspended Tenants"
              value={complianceMetrics.suspendedOrgs.length}
              status={complianceMetrics.suspendedOrgs.length > 0 ? 'warning' : 'ok'}
              icon={Lock}
              description="Currently suspended organizations"
            />
            <ComplianceCard
              title="Free Tier Overuse"
              value={complianceMetrics.overusingFreeOrgs.length}
              status={complianceMetrics.overusingFreeOrgs.length > 3 ? 'danger' : complianceMetrics.overusingFreeOrgs.length > 0 ? 'warning' : 'ok'}
              icon={FileWarning}
              description="Free orgs exceeding soft limits"
            />
            <ComplianceCard
              title="Security Events"
              value={complianceMetrics.totalSecurityEvents}
              status={complianceMetrics.totalSecurityEvents > 50 ? 'warning' : 'ok'}
              icon={ShieldAlert}
              description="Role/permission changes & deletions"
            />
          </div>

          {/* Security Activity Summary */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                Security Event Breakdown
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Role Changes', count: complianceMetrics.roleChanges.length, icon: UserX, accent: 'text-amber-400' },
                  { label: 'Permission Modifications', count: complianceMetrics.permissionChanges.length, icon: Shield, accent: 'text-purple-400' },
                  { label: 'Data Deletions', count: complianceMetrics.deletionEvents.length, icon: XCircle, accent: 'text-red-400' },
                  { label: 'Data Exports', count: complianceMetrics.dataExports.length, icon: Download, accent: 'text-blue-400' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <item.icon className={`h-4 w-4 ${item.accent}`} />
                      <span className="text-sm text-slate-300">{item.label}</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-slate-200">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* High Risk Tenants */}
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                High-Risk Tenants
              </h3>
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {organizations?.filter(o => o.risk_level === 'high').map(org => (
                  <div key={org.id} className="flex items-center gap-3 p-3 rounded-lg bg-red-900/10 border border-red-800/20">
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-200 block truncate">{org.name}</span>
                      <span className="text-[10px] text-slate-500">
                        Health: {org.health_score}% · {org.suspended_at ? 'Suspended' : org.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-red-700 text-red-400">High</Badge>
                  </div>
                ))}
                {(!organizations?.some(o => o.risk_level === 'high')) && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/50" />
                    No high-risk tenants
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Suspicious Activity */}
      {activeSection === 'suspicious' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Recent Role & Permission Changes
            </h3>
            <div className="rounded-lg border border-slate-700/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800/80 border-slate-700 hover:bg-slate-800/80">
                    <TableHead className="text-slate-400 text-xs">Time</TableHead>
                    <TableHead className="text-slate-400 text-xs">Event</TableHead>
                    <TableHead className="text-slate-400 text-xs">Entity</TableHead>
                    <TableHead className="text-slate-400 text-xs">User</TableHead>
                    <TableHead className="text-slate-400 text-xs">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceMetrics?.roleChanges.slice(0, 20).map(log => (
                    <TableRow key={log.id} className="border-slate-700/50 hover:bg-slate-800/30">
                      <TableCell className="text-xs text-slate-400 font-mono whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs border-amber-700 text-amber-300">
                          {log.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{log.entity_type}</TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono">
                        {log.user_id?.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                        {log.metadata ? JSON.stringify(log.metadata).slice(0, 50) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!complianceMetrics?.roleChanges.length) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No suspicious activity detected
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Deletion Events */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Recent Data Deletions
            </h3>
            <div className="rounded-lg border border-slate-700/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800/80 border-slate-700 hover:bg-slate-800/80">
                    <TableHead className="text-slate-400 text-xs">Time</TableHead>
                    <TableHead className="text-slate-400 text-xs">Entity Type</TableHead>
                    <TableHead className="text-slate-400 text-xs">Entity ID</TableHead>
                    <TableHead className="text-slate-400 text-xs">Deleted By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceMetrics?.deletionEvents.slice(0, 15).map(log => (
                    <TableRow key={log.id} className="border-slate-700/50 hover:bg-slate-800/30">
                      <TableCell className="text-xs text-slate-400 font-mono whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{log.entity_type}</TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono">
                        {log.entity_id?.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono">
                        {log.user_id?.slice(0, 8)}…
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!complianceMetrics?.deletionEvents.length) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        No deletion events recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Monitoring */}
      {activeSection === 'compliance' && (
        <div className="space-y-4">
          {/* Stale Organizations */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Organizations Without Recent Activity (60+ days)
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {complianceMetrics?.staleOrgs.map(org => (
                <div key={org.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                  <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-200 block truncate">{org.name}</span>
                    <span className="text-[10px] text-slate-500">
                      Last activity: {org.last_activity ? format(new Date(org.last_activity), 'MMM d, yyyy') : 'Never'}
                      {' · '}{org.member_count} members · {org.beneficiary_count} beneficiaries
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                    {org.subscription_tier || 'free'}
                  </Badge>
                </div>
              ))}
              {(!complianceMetrics?.staleOrgs.length) && (
                <div className="text-center py-8 text-slate-500 text-sm">All organizations are active</div>
              )}
            </div>
          </div>

          {/* Free Tier Overuse */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Free Tier Organizations Exceeding Soft Limits
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {complianceMetrics?.overusingFreeOrgs.map(org => (
                <div key={org.id} className="flex items-center gap-3 p-3 rounded-lg bg-amber-900/10 border border-amber-800/20">
                  <FileWarning className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-200 block truncate">{org.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {org.beneficiary_count} beneficiaries · {org.member_count} members · {org.program_count} programs
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-amber-700 text-amber-400">
                    Upgrade candidate
                  </Badge>
                </div>
              ))}
              {(!complianceMetrics?.overusingFreeOrgs.length) && (
                <div className="text-center py-8 text-slate-500 text-sm">No free tier overuse detected</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Exports & Audit Trail */}
      {activeSection === 'exports' && (
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Data Export Activity Log
          </h3>
          {complianceMetrics?.dataExports.length ? (
            <div className="rounded-lg border border-slate-700/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800/80 border-slate-700 hover:bg-slate-800/80">
                    <TableHead className="text-slate-400 text-xs">Time</TableHead>
                    <TableHead className="text-slate-400 text-xs">Event</TableHead>
                    <TableHead className="text-slate-400 text-xs">User</TableHead>
                    <TableHead className="text-slate-400 text-xs">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceMetrics.dataExports.map(log => (
                    <TableRow key={log.id} className="border-slate-700/50 hover:bg-slate-800/30">
                      <TableCell className="text-xs text-slate-400 font-mono">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{log.event_type}</TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono">{log.user_id?.slice(0, 8)}…</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {log.metadata ? JSON.stringify(log.metadata).slice(0, 60) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Download className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No data export events recorded</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
