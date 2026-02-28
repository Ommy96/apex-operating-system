import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useSystemStats, useAllOrganizations } from '@/hooks/useSystemAdmin';
import {
  Activity, Globe, Users, Heart, Layers, DollarSign, FileText, BarChart3,
  TrendingUp, Clock, Loader2, Database, Zap, Eye, Server,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
};

function MetricCard({ label, value, icon: Icon, accent, subtitle }: {
  label: string; value: string | number; icon: any; accent: string; subtitle?: string;
}) {
  const colors: Record<string, { bg: string; icon: string; text: string }> = {
    amber: { bg: 'from-amber-500/15 to-amber-600/5 border-amber-500/20', icon: 'text-amber-400', text: 'text-amber-400' },
    emerald: { bg: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/20', icon: 'text-emerald-400', text: 'text-emerald-400' },
    blue: { bg: 'from-blue-500/15 to-blue-600/5 border-blue-500/20', icon: 'text-blue-400', text: 'text-blue-400' },
    purple: { bg: 'from-purple-500/15 to-purple-600/5 border-purple-500/20', icon: 'text-purple-400', text: 'text-purple-400' },
    cyan: { bg: 'from-cyan-500/15 to-cyan-600/5 border-cyan-500/20', icon: 'text-cyan-400', text: 'text-cyan-400' },
    red: { bg: 'from-red-500/15 to-red-600/5 border-red-500/20', icon: 'text-red-400', text: 'text-red-400' },
    rose: { bg: 'from-rose-500/15 to-rose-600/5 border-rose-500/20', icon: 'text-rose-400', text: 'text-rose-400' },
    slate: { bg: 'from-slate-500/15 to-slate-600/5 border-slate-500/20', icon: 'text-slate-400', text: 'text-slate-300' },
  };
  const c = colors[accent] || colors.slate;
  return (
    <div className={`p-4 rounded-lg bg-gradient-to-br border ${c.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${c.icon}`} />
      </div>
      <div className={`text-2xl font-bold font-mono ${c.text}`}>{value}</div>
      {subtitle && <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export function PlatformIntelligence() {
  const { data: stats, isLoading: statsLoading } = useSystemStats();
  const { data: organizations, isLoading: orgsLoading } = useAllOrganizations();

  const isLoading = statsLoading || orgsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Compute derived analytics
  const totalOrgs = stats?.totalOrganizations || 0;
  const avgBeneficiariesPerOrg = totalOrgs > 0
    ? Math.round((stats?.totalBeneficiaries || 0) / totalOrgs)
    : 0;
  const avgUsersPerOrg = totalOrgs > 0
    ? Math.round((stats?.totalUsers || 0) / totalOrgs)
    : 0;

  // Health distribution
  const healthDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
  organizations?.forEach(org => {
    if (org.health_score >= 80) healthDistribution.excellent++;
    else if (org.health_score >= 60) healthDistribution.good++;
    else if (org.health_score >= 40) healthDistribution.fair++;
    else healthDistribution.poor++;
  });

  const healthChartData = [
    { name: 'Excellent', value: healthDistribution.excellent, color: '#10b981' },
    { name: 'Good', value: healthDistribution.good, color: '#3b82f6' },
    { name: 'Fair', value: healthDistribution.fair, color: '#f59e0b' },
    { name: 'Poor', value: healthDistribution.poor, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Risk distribution
  const riskDistribution = { low: 0, medium: 0, high: 0 };
  organizations?.forEach(org => {
    riskDistribution[org.risk_level]++;
  });

  // Beneficiary distribution by org (top 10)
  const topOrgsByBeneficiaries = [...(organizations || [])]
    .sort((a, b) => b.beneficiary_count - a.beneficiary_count)
    .slice(0, 8)
    .map(org => ({
      name: org.name.length > 15 ? org.name.slice(0, 15) + '…' : org.name,
      beneficiaries: org.beneficiary_count,
      programs: org.program_count,
      members: org.member_count,
    }));

  // Activity timeline (simulated from org created_at)
  const onboardingTrend = Array.from({ length: 12 }, (_, i) => {
    const d = subDays(new Date(), (11 - i) * 30);
    const month = format(d, 'MMM');
    const count = organizations?.filter(org => {
      const created = new Date(org.created_at);
      return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
    }).length || 0;
    return { month, orgs: count };
  });

  // Country distribution chart
  const countryData = stats?.orgsByCountry?.map(c => ({
    name: c.country,
    value: c.count,
  })) || [];

  const COUNTRY_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ef4444', '#06b6d4', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <Activity className="h-4 w-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">PLATFORM INTELLIGENCE DASHBOARD</span>
        <span className="ml-auto text-xs text-slate-500">Real-time metrics</span>
      </div>

      {/* Global Usage Metrics */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Global Usage Metrics</h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          <MetricCard label="Organizations" value={stats?.totalOrganizations || 0} icon={Globe} accent="amber" />
          <MetricCard label="Platform Users" value={stats?.totalUsers || 0} icon={Users} accent="blue" />
          <MetricCard label="Beneficiaries" value={(stats?.totalBeneficiaries || 0).toLocaleString()} icon={Heart} accent="purple" />
          <MetricCard label="Programs" value={stats?.totalPrograms || 0} icon={Layers} accent="cyan" />
          <MetricCard label="Transactions" value={(stats?.totalFinancialTransactions || 0).toLocaleString()} icon={DollarSign} accent="emerald" />
          <MetricCard label="Avg Users/Org" value={avgUsersPerOrg} icon={Users} accent="slate" subtitle="per organization" />
          <MetricCard label="Avg Beneficiaries" value={avgBeneficiariesPerOrg} icon={Heart} accent="rose" subtitle="per organization" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Onboarding Trend */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Organization Growth (12 months)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={onboardingTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="orgs" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Health Distribution */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Tenant Health Distribution
          </h3>
          {healthChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={healthChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {healthChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">No data</div>
          )}
        </div>

        {/* Country Distribution */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Geographic Distribution
          </h3>
          {countryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={countryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {countryData.map((_, i) => (
                    <Cell key={i} fill={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Top Organizations by Data Volume */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Top Organizations by Data Volume
        </h3>
        {topOrgsByBeneficiaries.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topOrgsByBeneficiaries} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="beneficiaries" fill="#a855f7" radius={[0, 4, 4, 0]} name="Beneficiaries" />
              <Bar dataKey="programs" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Programs" />
              <Bar dataKey="members" fill="#10b981" radius={[0, 4, 4, 0]} name="Members" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">No data</div>
        )}
      </div>

      {/* Risk & System Summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Risk Summary */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Platform Risk Overview</h3>
          <div className="space-y-3">
            {[
              { level: 'Low Risk', count: riskDistribution.low, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
              { level: 'Medium Risk', count: riskDistribution.medium, color: 'text-amber-400', bg: 'bg-amber-500/20' },
              { level: 'High Risk', count: riskDistribution.high, color: 'text-red-400', bg: 'bg-red-500/20' },
            ].map(r => (
              <div key={r.level} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${r.bg}`} />
                  <span className="text-sm text-slate-300">{r.level}</span>
                </div>
                <span className={`text-lg font-bold font-mono ${r.color}`}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Activity Summary */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">System Summary</h3>
          <div className="space-y-3">
            {[
              { label: 'Active Organizations', value: stats?.activeOrganizations || 0, total: totalOrgs, icon: Zap, accent: 'text-emerald-400' },
              { label: 'Suspended', value: stats?.suspendedOrganizations || 0, total: totalOrgs, icon: Server, accent: 'text-red-400' },
              { label: 'Onboarding Complete', value: stats?.onboardingCompleted || 0, total: totalOrgs, icon: Eye, accent: 'text-blue-400' },
              { label: 'Onboarding Pending', value: stats?.onboardingPending || 0, total: totalOrgs, icon: Clock, accent: 'text-amber-400' },
              { label: 'Trial Accounts', value: stats?.trialOrganizations || 0, total: totalOrgs, icon: Clock, accent: 'text-cyan-400' },
            ].map(item => {
              const pct = totalOrgs > 0 ? (item.value / totalOrgs) * 100 : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className={`h-3.5 w-3.5 ${item.accent}`} />
                      <span className="text-xs text-slate-300">{item.label}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{item.value} / {item.total}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      item.accent.includes('emerald') ? 'bg-emerald-500' :
                      item.accent.includes('red') ? 'bg-red-500' :
                      item.accent.includes('blue') ? 'bg-blue-500' :
                      item.accent.includes('amber') ? 'bg-amber-500' : 'bg-cyan-500'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
