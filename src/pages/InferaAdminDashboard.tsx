import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSystemStats } from '@/hooks/useSystemAdmin';
import { isSuperAdmin } from '@/lib/superAdmin';
import { 
  Building2, Users, CreditCard, Activity, Shield, Loader2, BarChart3, 
  Flag, Globe, DollarSign, TrendingUp, Heart, Layers, AlertTriangle,
  FileText, Eye, Zap, Settings, Brain, Palette, Megaphone,
} from 'lucide-react';
import { OrganizationManagement } from '@/components/admin/OrganizationManagement';
import { UserAdministration } from '@/components/admin/UserAdministration';
import { BillingDashboard } from '@/components/admin/BillingDashboard';
import { SystemMonitoring } from '@/components/admin/SystemMonitoring';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { PlatformIntelligence } from '@/components/admin/PlatformIntelligence';
import { SecurityCompliance } from '@/components/admin/SecurityCompliance';
import { PlatformRiskDashboard } from '@/components/admin/PlatformRiskDashboard';
import { SystemConfiguration } from '@/components/admin/SystemConfiguration';
import { AIGatewayOversight } from '@/components/admin/AIGatewayOversight';
import { WhiteLabelManagement } from '@/components/admin/WhiteLabelManagement';
import { PlatformCommunications } from '@/components/admin/PlatformCommunications';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

const TIER_COLORS: Record<string, string> = {
  free: '#64748b',
  starter: '#3b82f6',
  professional: '#a855f7',
  enterprise: '#f59e0b',
};

function StatBlock({ label, value, icon: Icon, accent = 'slate' }: { label: string; value: string | number; icon: any; accent?: string }) {
  const accentMap: Record<string, string> = {
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20',
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20',
    slate: 'from-slate-500/20 to-slate-600/5 border-slate-500/20',
  };
  const iconMap: Record<string, string> = {
    amber: 'text-amber-400', emerald: 'text-emerald-400', blue: 'text-blue-400',
    purple: 'text-purple-400', red: 'text-red-400', cyan: 'text-cyan-400', slate: 'text-slate-400',
  };
  return (
    <div className={`p-4 rounded-lg bg-gradient-to-br border ${accentMap[accent]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${iconMap[accent]}`} />
      </div>
      <div className="text-2xl font-bold text-slate-100 font-mono">{value}</div>
    </div>
  );
}

export default function InferaAdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useSystemStats();
  const [activeTab, setActiveTab] = useState('overview');

  const isSuperAdminUser = isSuperAdmin(user?.email);

  if (!isSuperAdminUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-slate-600 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-300">Access Restricted</h2>
          <p className="text-slate-500">This console is restricted to system administrators.</p>
        </div>
      </div>
    );
  }

  const tierChartData = stats?.revenueByTier.map(item => ({
    name: item.tier.charAt(0).toUpperCase() + item.tier.slice(1),
    value: item.count,
    color: TIER_COLORS[item.tier] || '#64748b',
  })) || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Top Bar */}
      <div className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Platform Control Center</h1>
              <p className="text-xs text-slate-500">Infera SaaS Governance Console</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-400">System Online</span>
            </div>
            <Badge variant="outline" className="border-amber-600/50 text-amber-400 text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Super Admin
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-max md:w-auto bg-slate-800/50 border border-slate-700/50">
              <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="tenants" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Tenants</span>
              </TabsTrigger>
              <TabsTrigger value="intelligence" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Intelligence</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Revenue</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="risk" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Risk</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Audit</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">Flags</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">AI</span>
              </TabsTrigger>
              <TabsTrigger value="whitelabel" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Branding</span>
              </TabsTrigger>
              <TabsTrigger value="comms" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
                <Megaphone className="h-4 w-4" />
                <span className="hidden sm:inline">Comms</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : (
              <>
                {/* Primary Stats Grid */}
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                  <StatBlock label="Organizations" value={stats?.totalOrganizations || 0} icon={Building2} accent="amber" />
                  <StatBlock label="Active" value={stats?.activeOrganizations || 0} icon={Zap} accent="emerald" />
                  <StatBlock label="Platform Users" value={stats?.totalUsers || 0} icon={Users} accent="blue" />
                  <StatBlock label="Beneficiaries" value={stats?.totalBeneficiaries || 0} icon={Heart} accent="purple" />
                  <StatBlock label="Programs" value={stats?.totalPrograms || 0} icon={Layers} accent="cyan" />
                  <StatBlock label="Suspended" value={stats?.suspendedOrganizations || 0} icon={AlertTriangle} accent="red" />
                </div>

                {/* Revenue + Distribution */}
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Revenue Metrics */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Revenue</h3>
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400">Monthly Recurring</span>
                          <DollarSign className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div className="text-3xl font-bold text-emerald-400 font-mono">${stats?.monthlyRevenue?.toLocaleString() || 0}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400">Annual Recurring</span>
                          <TrendingUp className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="text-3xl font-bold text-blue-400 font-mono">${stats?.annualRevenue?.toLocaleString() || 0}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                          <span className="text-xs text-slate-400 block mb-1">Trial</span>
                          <span className="text-lg font-bold text-cyan-400 font-mono">{stats?.trialOrganizations || 0}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                          <span className="text-xs text-slate-400 block mb-1">Onboarded</span>
                          <span className="text-lg font-bold text-emerald-400 font-mono">{stats?.onboardingCompleted || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tier Distribution Chart */}
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Plan Distribution</h3>
                    {tierChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={tierChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {tierChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              color: '#e2e8f0',
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[260px] text-slate-500">
                        No data
                      </div>
                    )}
                  </div>

                  {/* Quick Navigation */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Access</h3>
                    <div className="space-y-2">
                      {[
                        { tab: 'tenants', label: 'Tenant Management', desc: 'Organizations & subscriptions', icon: Building2, count: stats?.totalOrganizations, accent: 'amber' },
                        { tab: 'intelligence', label: 'Platform Intelligence', desc: 'Global analytics & metrics', icon: Activity, count: null, accent: 'cyan' },
                        { tab: 'users', label: 'User Administration', desc: 'All platform users', icon: Users, count: stats?.totalUsers, accent: 'blue' },
                        { tab: 'billing', label: 'Revenue Center', desc: 'Billing & subscriptions', icon: CreditCard, count: `$${stats?.monthlyRevenue || 0}`, accent: 'emerald' },
                        { tab: 'security', label: 'Security & Compliance', desc: 'Threat monitoring & compliance', icon: Shield, count: null, accent: 'purple' },
                        { tab: 'risk', label: 'Risk Dashboard', desc: 'Platform risk assessment', icon: AlertTriangle, count: null, accent: 'red' },
                        { tab: 'audit', label: 'Audit Logs', desc: 'System-wide activity', icon: Eye, count: null, accent: 'purple' },
                        { tab: 'system', label: 'Feature Flags', desc: 'Module & feature control', icon: Flag, count: null, accent: 'cyan' },
                      ].map(({ tab, label, desc, icon: Icon, count, accent }) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/30 hover:border-slate-600/50 transition-all text-left"
                        >
                          <Icon className={`h-5 w-5 ${accent === 'amber' ? 'text-amber-400' : accent === 'blue' ? 'text-blue-400' : accent === 'emerald' ? 'text-emerald-400' : accent === 'purple' ? 'text-purple-400' : accent === 'red' ? 'text-red-400' : 'text-cyan-400'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-200">{label}</div>
                            <div className="text-xs text-slate-500">{desc}</div>
                          </div>
                          {count !== null && count !== undefined && (
                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs font-mono">
                              {count}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Country Distribution */}
                    {stats?.orgsByCountry && stats.orgsByCountry.length > 0 && (
                      <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                        <h4 className="text-xs text-slate-400 font-medium mb-2 flex items-center gap-1">
                          <Globe className="h-3 w-3" /> By Country
                        </h4>
                        <div className="space-y-1">
                          {stats.orgsByCountry.map(({ country, count }) => (
                            <div key={country} className="flex items-center justify-between text-xs">
                              <span className="text-slate-300">{country}</span>
                              <span className="text-slate-400 font-mono">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="tenants">
            <OrganizationManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserAdministration />
          </TabsContent>

          <TabsContent value="billing">
            <BillingDashboard />
          </TabsContent>

          <TabsContent value="intelligence">
            <PlatformIntelligence />
          </TabsContent>

          <TabsContent value="security">
            <SecurityCompliance />
          </TabsContent>

          <TabsContent value="risk">
            <PlatformRiskDashboard />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogViewer />
          </TabsContent>

          <TabsContent value="system">
            <SystemMonitoring />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
