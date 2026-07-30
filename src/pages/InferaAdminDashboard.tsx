import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSystemStats } from '@/hooks/useSystemAdmin';
import { isSuperAdmin } from '@/lib/superAdmin';
import { 
  Building2, Users, CreditCard, Activity, Shield, Loader2, BarChart3, 
  Flag, Globe, DollarSign, TrendingUp, Heart, Layers, AlertTriangle,
  FileText, Eye, Zap, Settings, Brain, Palette, Megaphone, LogOut, Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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
import { PartnerAccessLog } from '@/components/admin/PartnerAccessLog';
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
    amber: 'from-warning/20 to-warning/5 border-warning/20',
    emerald: 'from-success/20 to-success/5 border-success/20',
    blue: 'from-info/20 to-info/5 border-info/20',
    purple: 'from-info/20 to-info/5 border-info/20',
    red: 'from-destructive/20 to-destructive/5 border-destructive/20',
    cyan: 'from-info/20 to-info/5 border-info/20',
    slate: 'from-slate-500/20 to-slate-600/5 border-border/20',
  };
  const iconMap: Record<string, string> = {
    amber: 'text-warning', emerald: 'text-success', blue: 'text-info',
    purple: 'text-info', red: 'text-destructive', cyan: 'text-info', slate: 'text-muted-foreground',
  };
  return (
    <div className={`p-4 rounded-lg bg-gradient-to-br border ${accentMap[accent]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${iconMap[accent]}`} />
      </div>
      <div className="text-2xl font-bold text-muted-foreground font-mono">{value}</div>
    </div>
  );
}

export default function InferaAdminDashboard() {
  const { user, signOut } = useAuth();
  const { data: stats, isLoading } = useSystemStats();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = async () => {
    await signOut();
    navigate('/super-admin');
  };

  const isSuperAdminUser = isSuperAdmin(user?.email);

  if (!isSuperAdminUser) {
    return (
      <div className="min-h-screen bg-muted-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-foreground mx-auto" />
          <h2 className="text-xl font-semibold text-muted-foreground">Access Restricted</h2>
          <p className="text-muted-foreground">This console is restricted to system administrators.</p>
        </div>
      </div>
    );
  }

  const tierChartData = stats?.revenueByTier.map(item => ({
    name: item.tier.charAt(0).toUpperCase() + item.tier.slice(1),
    value: item.count,
    color: TIER_COLORS[item.tier] || '#64748b',
  })) || [];

  const impersonating = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('impersonating_org') || 'null') : null;

  return (
    <div className="min-h-screen bg-muted-foreground text-muted-foreground">
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="bg-warning text-white px-4 py-2 text-sm flex items-center justify-between">
          <span>⚠️ You are impersonating <strong>{impersonating.orgName}</strong></span>
          <Button size="sm" variant="ghost" className="text-white hover:bg-warning h-7" onClick={() => { sessionStorage.removeItem('impersonating_org'); window.location.reload(); }}>
            Exit Impersonation
          </Button>
        </div>
      )}

      {/* Top Bar */}
      <div className="border-b border-border bg-muted-foreground/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-warning to-warning">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-muted-foreground">Platform Control Center</h1>
              <p className="text-xs text-muted-foreground">Infera SaaS Governance Console</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted-foreground border border-border">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground">System Online</span>
            </div>
            <Badge variant="outline" className="border-warning/50 text-warning text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Super Admin
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive hover:bg-muted-foreground">
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-max md:w-auto bg-muted-foreground/50 border border-border/50">
              <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="tenants" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Tenants</span>
              </TabsTrigger>
              <TabsTrigger value="intelligence" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Intelligence</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Revenue</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="risk" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Risk</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Audit</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">Flags</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">AI</span>
              </TabsTrigger>
              <TabsTrigger value="whitelabel" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Branding</span>
              </TabsTrigger>
              <TabsTrigger value="comms" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <Megaphone className="h-4 w-4" />
                <span className="hidden sm:inline">Comms</span>
              </TabsTrigger>
              <TabsTrigger value="partners" className="gap-2 data-[state=active]:bg-muted-foreground data-[state=active]:text-warning">
                <Crown className="h-4 w-4" />
                <span className="hidden sm:inline">Partners</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-warning" />
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
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue</h3>
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-muted-foreground/50 border border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Monthly Recurring</span>
                          <DollarSign className="h-4 w-4 text-success" />
                        </div>
                        <div className="text-3xl font-bold text-success font-mono">${stats?.monthlyRevenue?.toLocaleString() || 0}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted-foreground/50 border border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Annual Recurring</span>
                          <TrendingUp className="h-4 w-4 text-info" />
                        </div>
                        <div className="text-3xl font-bold text-info font-mono">${stats?.annualRevenue?.toLocaleString() || 0}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-muted-foreground/50 border border-border/50">
                          <span className="text-xs text-muted-foreground block mb-1">Trial</span>
                          <span className="text-lg font-bold text-info font-mono">{stats?.trialOrganizations || 0}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-muted-foreground/50 border border-border/50">
                          <span className="text-xs text-muted-foreground block mb-1">Onboarded</span>
                          <span className="text-lg font-bold text-success font-mono">{stats?.onboardingCompleted || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tier Distribution Chart */}
                  <div className="p-4 rounded-lg bg-muted-foreground/50 border border-border/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Plan Distribution</h3>
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
                      <div className="flex items-center justify-center h-[260px] text-muted-foreground">
                        No data
                      </div>
                    )}
                  </div>

                  {/* Quick Navigation */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Access</h3>
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
                        { tab: 'config', label: 'System Config', desc: 'Platform-wide settings', icon: Settings, count: null, accent: 'amber' },
                        { tab: 'ai', label: 'AI Oversight', desc: 'Gateway usage & costs', icon: Brain, count: null, accent: 'blue' },
                        { tab: 'whitelabel', label: 'White-Label', desc: 'Tenant branding & domains', icon: Palette, count: null, accent: 'purple' },
                        { tab: 'comms', label: 'Communications', desc: 'Announcements & banners', icon: Megaphone, count: null, accent: 'cyan' },
                      ].map(({ tab, label, desc, icon: Icon, count, accent }) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted-foreground/30 hover:bg-muted-foreground/60 border border-border/30 hover:border-border/50 transition-all text-left"
                        >
                          <Icon className={`h-5 w-5 ${accent === 'amber' ? 'text-warning' : accent === 'blue' ? 'text-info' : accent === 'emerald' ? 'text-success' : accent === 'purple' ? 'text-info' : accent === 'red' ? 'text-destructive' : 'text-info'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-muted-foreground">{label}</div>
                            <div className="text-xs text-muted-foreground">{desc}</div>
                          </div>
                          {count !== null && count !== undefined && (
                            <Badge variant="outline" className="border-border text-muted-foreground text-xs font-mono">
                              {count}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Country Distribution */}
                    {stats?.orgsByCountry && stats.orgsByCountry.length > 0 && (
                      <div className="p-3 rounded-lg bg-muted-foreground/30 border border-border/30">
                        <h4 className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                          <Globe className="h-3 w-3" /> By Country
                        </h4>
                        <div className="space-y-1">
                          {stats.orgsByCountry.map(({ country, count }) => (
                            <div key={country} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{country}</span>
                              <span className="text-muted-foreground font-mono">{count}</span>
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

          <TabsContent value="config">
            <SystemConfiguration />
          </TabsContent>

          <TabsContent value="ai">
            <AIGatewayOversight />
          </TabsContent>

          <TabsContent value="whitelabel">
            <WhiteLabelManagement />
          </TabsContent>

          <TabsContent value="comms">
            <PlatformCommunications />
          </TabsContent>

          <TabsContent value="partners">
            <PartnerAccessLog />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
