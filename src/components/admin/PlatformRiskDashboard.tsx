import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useAllOrganizations, useSystemStats } from '@/hooks/useSystemAdmin';
import {
  AlertTriangle, TrendingDown, Shield, Users, DollarSign, Activity,
  Loader2, CheckCircle2, XCircle, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
};

export function PlatformRiskDashboard() {
  const { data: organizations, isLoading: orgsLoading } = useAllOrganizations();
  const { data: stats, isLoading: statsLoading } = useSystemStats();

  const isLoading = orgsLoading || statsLoading;

  const riskAnalysis = useMemo(() => {
    if (!organizations) return null;

    const highRisk = organizations.filter(o => o.risk_level === 'high');
    const mediumRisk = organizations.filter(o => o.risk_level === 'medium');

    // Abnormal patterns
    const noActivityOrgs = organizations.filter(o => !o.last_activity && o.is_active);
    const suspendedWithData = organizations.filter(o => o.suspended_at && o.beneficiary_count > 0);
    const excessiveUsers = organizations.filter(o => o.member_count > 50);
    const emptyActiveOrgs = organizations.filter(
      o => o.is_active && o.beneficiary_count === 0 && o.program_count === 0
    );

    // Health score distribution for chart
    const healthBuckets = [
      { range: '0-20', count: organizations.filter(o => o.health_score <= 20).length },
      { range: '21-40', count: organizations.filter(o => o.health_score > 20 && o.health_score <= 40).length },
      { range: '41-60', count: organizations.filter(o => o.health_score > 40 && o.health_score <= 60).length },
      { range: '61-80', count: organizations.filter(o => o.health_score > 60 && o.health_score <= 80).length },
      { range: '81-100', count: organizations.filter(o => o.health_score > 80).length },
    ];

    return {
      highRisk,
      mediumRisk,
      noActivityOrgs,
      suspendedWithData,
      excessiveUsers,
      emptyActiveOrgs,
      healthBuckets,
      overallRiskScore: highRisk.length * 3 + mediumRisk.length,
    };
  }, [organizations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  if (!riskAnalysis) return null;

  const riskLevel = riskAnalysis.overallRiskScore > 15 ? 'Critical' :
    riskAnalysis.overallRiskScore > 8 ? 'Elevated' :
    riskAnalysis.overallRiskScore > 3 ? 'Moderate' : 'Low';
  const riskColor = riskLevel === 'Critical' ? 'text-destructive' :
    riskLevel === 'Elevated' ? 'text-warning' :
    riskLevel === 'Moderate' ? 'text-warning' : 'text-success';

  const flags = [
    { label: 'High-risk tenants', count: riskAnalysis.highRisk.length, icon: AlertTriangle, threshold: 0, accent: 'red' },
    { label: 'Active orgs with no activity', count: riskAnalysis.noActivityOrgs.length, icon: Activity, threshold: 0, accent: 'amber' },
    { label: 'Suspended with live data', count: riskAnalysis.suspendedWithData.length, icon: Shield, threshold: 0, accent: 'purple' },
    { label: 'Excessive user counts', count: riskAnalysis.excessiveUsers.length, icon: Users, threshold: 0, accent: 'blue' },
    { label: 'Empty active organizations', count: riskAnalysis.emptyActiveOrgs.length, icon: XCircle, threshold: 0, accent: 'cyan' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted-foreground/50 border border-border/50">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">PLATFORM RISK DASHBOARD</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Overall Risk:</span>
          <Badge variant="outline" className={`text-xs ${riskColor} border-current`}>
            {riskLevel} ({riskAnalysis.overallRiskScore})
          </Badge>
        </div>
      </div>

      {/* Risk Flags */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {flags.map(flag => {
          const isOk = flag.count === 0;
          const colorMap: Record<string, string> = {
            red: 'border-destructive/20 from-destructive/10 to-destructive/5',
            amber: 'border-warning/20 from-warning/10 to-warning/5',
            purple: 'border-info/20 from-info/10 to-info/5',
            blue: 'border-info/20 from-info/10 to-info/5',
            cyan: 'border-info/20 from-info/10 to-info/5',
          };
          const iconColorMap: Record<string, string> = {
            red: 'text-destructive', amber: 'text-warning', purple: 'text-info',
            blue: 'text-info', cyan: 'text-info',
          };
          return (
            <div key={flag.label} className={`p-4 rounded-lg bg-gradient-to-br border ${isOk ? 'border-success/20 from-success/10 to-success/5' : colorMap[flag.accent]}`}>
              <div className="flex items-center justify-between mb-2">
                <flag.icon className={`h-4 w-4 ${isOk ? 'text-success' : iconColorMap[flag.accent]}`} />
                {isOk ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
              </div>
              <div className="text-2xl font-bold font-mono text-muted-foreground">{flag.count}</div>
              <p className="text-[10px] text-muted-foreground mt-1">{flag.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Health Score Distribution */}
        <div className="p-4 rounded-lg bg-muted-foreground/50 border border-border/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Health Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={riskAnalysis.healthBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {riskAnalysis.healthBuckets.map((_, i) => {
                  const colors = ['#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#10b981'];
                  return <rect key={i} fill={colors[i]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* High Risk Tenant List */}
        <div className="p-4 rounded-lg bg-muted-foreground/50 border border-border/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Flagged Tenants
          </h3>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {riskAnalysis.highRisk.map(org => (
              <div key={org.id} className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-muted-foreground truncate block">{org.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    Score: {org.health_score}% · {org.suspended_at ? 'Suspended' : 'Active'} · {org.subscription_tier}
                  </span>
                </div>
              </div>
            ))}
            {riskAnalysis.mediumRisk.slice(0, 5).map(org => (
              <div key={org.id} className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <Zap className="h-4 w-4 text-warning flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-muted-foreground truncate block">{org.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    Score: {org.health_score}% · {org.subscription_tier}
                  </span>
                </div>
              </div>
            ))}
            {riskAnalysis.highRisk.length === 0 && riskAnalysis.mediumRisk.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="text-sm">No flagged tenants</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
