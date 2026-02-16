import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSystemStats } from '@/hooks/useSystemAdmin';
import { PageHeroHeader } from '@/components/PageHeroHeader';
import { StatsCard } from '@/components/StatsCard';
import { isSuperAdmin } from '@/lib/superAdmin';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Activity,
  Shield,
  Loader2,
  BarChart3,
  Flag,
} from 'lucide-react';
import { OrganizationManagement } from '@/components/admin/OrganizationManagement';
import { UserAdministration } from '@/components/admin/UserAdministration';
import { BillingDashboard } from '@/components/admin/BillingDashboard';
import { SystemMonitoring } from '@/components/admin/SystemMonitoring';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const TIER_COLORS: Record<string, string> = {
  free: 'hsl(var(--muted-foreground))',
  starter: 'hsl(var(--primary))',
  professional: 'hsl(var(--accent))',
  enterprise: 'hsl(280, 70%, 50%)',
};

export default function InferaAdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useSystemStats();
  const [activeTab, setActiveTab] = useState('overview');

  const isSuperAdminUser = isSuperAdmin(user?.email);

  if (!isSuperAdminUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground">This dashboard is only available to the Infera super administrator.</p>
        </div>
      </div>
    );
  }

  const tierChartData = stats?.revenueByTier.map(item => ({
    name: item.tier.charAt(0).toUpperCase() + item.tier.slice(1),
    value: item.count,
    color: TIER_COLORS[item.tier] || 'hsl(var(--muted))',
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeroHeader
        title="Infera System Administration"
        description="Manage organizations, users, billing, and system health"
        icon={Shield}
        iconColorClass="bg-gradient-to-br from-violet-600 to-purple-600 text-white"
        stats={[
          { label: "Organizations", value: stats?.totalOrganizations?.toString() || "0" },
          { label: "Active", value: stats?.activeOrganizations?.toString() || "0" },
          { label: "Users", value: stats?.totalUsers?.toString() || "0" },
          { label: "Beneficiaries", value: stats?.totalBeneficiaries?.toString() || "0" },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="organizations" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Organizations</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title="Total Organizations"
                  value={stats?.totalOrganizations || 0}
                  subtitle={`${stats?.suspendedOrganizations || 0} suspended`}
                  icon={Building2}
                  colorVariant="blue"
                />
                <StatsCard
                  title="Platform Users"
                  value={stats?.totalUsers || 0}
                  subtitle="Across all organizations"
                  icon={Users}
                  colorVariant="emerald"
                />
                <StatsCard
                  title="Total Beneficiaries"
                  value={stats?.totalBeneficiaries || 0}
                  subtitle="All programs combined"
                  icon={Users}
                  colorVariant="purple"
                />
                <StatsCard
                  title="Active Programs"
                  value={0}
                  subtitle="Across all orgs"
                  icon={Activity}
                  colorVariant="orange"
                />
              </div>

              {/* Charts Row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Subscription Tier Distribution */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Subscription Distribution
                    </CardTitle>
                    <CardDescription>Organizations by subscription tier</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tierChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={tierChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {tierChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flag className="h-5 w-5 text-primary" />
                      Quick Actions
                    </CardTitle>
                    <CardDescription>Common administrative tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div 
                      onClick={() => setActiveTab('organizations')}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="p-3 rounded-xl bg-blue-500/10">
                        <Building2 className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Manage Organizations</h4>
                        <p className="text-sm text-muted-foreground">Activate, suspend, or configure organizations</p>
                      </div>
                      <Badge variant="secondary">{stats?.totalOrganizations}</Badge>
                    </div>

                    <div 
                      onClick={() => setActiveTab('users')}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="p-3 rounded-xl bg-emerald-500/10">
                        <Users className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">User Administration</h4>
                        <p className="text-sm text-muted-foreground">View and manage all platform users</p>
                      </div>
                      <Badge variant="secondary">{stats?.totalUsers}</Badge>
                    </div>

                    <div 
                      onClick={() => setActiveTab('system')}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="p-3 rounded-xl bg-orange-500/10">
                        <Activity className="h-6 w-6 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">System Monitoring</h4>
                        <p className="text-sm text-muted-foreground">Feature flags and platform controls</p>
                      </div>
                      <Badge variant="secondary">
                        Manage
                      </Badge>
                    </div>

                    <div 
                      onClick={() => setActiveTab('system')}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="p-3 rounded-xl bg-violet-500/10">
                        <Flag className="h-6 w-6 text-violet-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Feature Flags</h4>
                        <p className="text-sm text-muted-foreground">Manage platform feature toggles</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations">
          <OrganizationManagement />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <UserAdministration />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <BillingDashboard />
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <SystemMonitoring />
        </TabsContent>
      </Tabs>
    </div>
  );
}
