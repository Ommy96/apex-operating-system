import { useQuery } from '@tanstack/react-query';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  UtensilsCrossed,
  Heart,
  Lightbulb,
  TrendingUp,
  Globe,
  Activity,
  BarChart3,
  PieChart,
  Shield,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PageHeroHeader } from '@/components/PageHeroHeader';
import { StatsCard } from '@/components/StatsCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface OrgStats {
  id: string;
  name: string;
  slug: string;
  childrenCount: number;
  feedingCount: number;
  kipawaCount: number;
  empowermentCount: number;
  membersCount: number;
  totalBeneficiaries: number;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(340, 70%, 50%)',
];

export default function AdminCrossOrgDashboard() {
  const { isAdmin, user } = useAuth();

  // Fetch all organizations with their stats
  const { data: orgStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-cross-org-stats'],
    queryFn: async () => {
      // Fetch all organizations (super admin can see all)
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');

      if (orgsError) throw orgsError;
      if (!orgs || orgs.length === 0) return [];

      // Fetch stats for each organization
      const statsPromises = orgs.map(async (org) => {
        const [childrenRes, feedingRes, kipawaRes, empowermentRes, membersRes] = await Promise.all([
          supabase.from('children').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
          supabase.from('feeding_program').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
          supabase.from('kipawa_sato').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
          supabase.from('self_empowerment').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
          supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
        ]);

        const childrenCount = childrenRes.count || 0;
        const feedingCount = feedingRes.count || 0;
        const kipawaCount = kipawaRes.count || 0;
        const empowermentCount = empowermentRes.count || 0;
        const membersCount = membersRes.count || 0;

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          childrenCount,
          feedingCount,
          kipawaCount,
          empowermentCount,
          membersCount,
          totalBeneficiaries: childrenCount + feedingCount + kipawaCount + empowermentCount,
        } as OrgStats;
      });

      return Promise.all(statsPromises);
    },
    enabled: isAdmin,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch global aggregated stats
  const { data: globalStats, isLoading: globalLoading } = useQuery({
    queryKey: ['admin-global-stats'],
    queryFn: async () => {
      const [orgsRes, childrenRes, feedingRes, kipawaRes, empowermentRes, membersRes, alumniRes] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('children').select('*', { count: 'exact', head: true }),
        supabase.from('feeding_program').select('*', { count: 'exact', head: true }),
        supabase.from('kipawa_sato').select('*', { count: 'exact', head: true }),
        supabase.from('self_empowerment').select('*', { count: 'exact', head: true }),
        supabase.from('organization_members').select('*', { count: 'exact', head: true }),
        supabase.from('alumni').select('*', { count: 'exact', head: true }),
      ]);

      return {
        totalOrgs: orgsRes.count || 0,
        totalChildren: childrenRes.count || 0,
        totalFeeding: feedingRes.count || 0,
        totalKipawa: kipawaRes.count || 0,
        totalEmpowerment: empowermentRes.count || 0,
        totalMembers: membersRes.count || 0,
        totalAlumni: alumniRes.count || 0,
        totalBeneficiaries: (childrenRes.count || 0) + (feedingRes.count || 0) + 
                          (kipawaRes.count || 0) + (empowermentRes.count || 0),
      };
    },
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  // Fetch recent activity across all orgs
  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground">This dashboard is only available to super administrators.</p>
        </div>
      </div>
    );
  }

  const isLoading = statsLoading || globalLoading;

  // Prepare chart data
  const orgChartData = orgStats?.map(org => ({
    name: org.name.length > 15 ? org.name.substring(0, 15) + '...' : org.name,
    beneficiaries: org.totalBeneficiaries,
    members: org.membersCount,
  })) || [];

  const programDistributionData = [
    { name: 'Education', value: globalStats?.totalChildren || 0, color: CHART_COLORS[0] },
    { name: 'Feeding', value: globalStats?.totalFeeding || 0, color: CHART_COLORS[1] },
    { name: 'Kipawa Sato', value: globalStats?.totalKipawa || 0, color: CHART_COLORS[2] },
    { name: 'Empowerment', value: globalStats?.totalEmpowerment || 0, color: CHART_COLORS[3] },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeroHeader
        title="Cross-Organization Dashboard"
        description="Aggregated view of all organizations and programs"
        icon={Globe}
        iconColorClass="bg-gradient-to-br from-primary to-accent text-white"
        stats={[
          { label: "Organizations", value: globalStats?.totalOrgs?.toString() || "0" },
          { label: "Total Beneficiaries", value: globalStats?.totalBeneficiaries?.toString() || "0" },
          { label: "Team Members", value: globalStats?.totalMembers?.toString() || "0" },
          { label: "Alumni", value: globalStats?.totalAlumni?.toString() || "0" },
        ]}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Global Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Organizations"
              value={globalStats?.totalOrgs || 0}
              subtitle="Active organizations"
              icon={Building2}
              colorVariant="blue"
            />
            <StatsCard
              title="Education Program"
              value={globalStats?.totalChildren || 0}
              subtitle="Children in school across all orgs"
              icon={GraduationCap}
              colorVariant="emerald"
            />
            <StatsCard
              title="Feeding Program"
              value={globalStats?.totalFeeding || 0}
              subtitle="Total enrolled"
              icon={UtensilsCrossed}
              colorVariant="orange"
            />
            <StatsCard
              title="Kipawa Sato"
              value={globalStats?.totalKipawa || 0}
              subtitle="Talent development"
              icon={Heart}
              colorVariant="rose"
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Organization Comparison Chart */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Beneficiaries by Organization
                </CardTitle>
                <CardDescription>Compare program reach across organizations</CardDescription>
              </CardHeader>
              <CardContent>
                {orgChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={orgChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        className="text-xs fill-muted-foreground"
                      />
                      <YAxis className="text-xs fill-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="beneficiaries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Program Distribution Pie Chart */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Program Distribution
                </CardTitle>
                <CardDescription>Beneficiaries across all programs</CardDescription>
              </CardHeader>
              <CardContent>
                {programDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={programDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {programDistributionData.map((entry, index) => (
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
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Organizations Detail Table */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Organization Details
              </CardTitle>
              <CardDescription>Detailed breakdown by organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orgStats?.map((org, index) => (
                  <div key={org.id} className="p-4 rounded-xl bg-muted/30 border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        >
                          {org.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold">{org.name}</h3>
                          <p className="text-sm text-muted-foreground">/{org.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          {org.membersCount} members
                        </Badge>
                        <Badge variant="outline">
                          {org.totalBeneficiaries} beneficiaries
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="text-center p-2 rounded-lg bg-background/50">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <GraduationCap className="h-3 w-3" />
                          <span className="text-xs">Education</span>
                        </div>
                        <p className="font-semibold">{org.childrenCount}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background/50">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <UtensilsCrossed className="h-3 w-3" />
                          <span className="text-xs">Feeding</span>
                        </div>
                        <p className="font-semibold">{org.feedingCount}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background/50">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Heart className="h-3 w-3" />
                          <span className="text-xs">Kipawa</span>
                        </div>
                        <p className="font-semibold">{org.kipawaCount}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background/50">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Lightbulb className="h-3 w-3" />
                          <span className="text-xs">Empowerment</span>
                        </div>
                        <p className="font-semibold">{org.empowermentCount}</p>
                      </div>
                    </div>

                    {/* Progress bar showing distribution */}
                    {org.totalBeneficiaries > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary transition-all" 
                            style={{ width: `${(org.childrenCount / org.totalBeneficiaries) * 100}%` }}
                          />
                          <div 
                            className="bg-secondary transition-all" 
                            style={{ width: `${(org.feedingCount / org.totalBeneficiaries) * 100}%` }}
                          />
                          <div 
                            className="bg-accent transition-all" 
                            style={{ width: `${(org.kipawaCount / org.totalBeneficiaries) * 100}%` }}
                          />
                          <div 
                            className="bg-orange-500 transition-all" 
                            style={{ width: `${(org.empowermentCount / org.totalBeneficiaries) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {(!orgStats || orgStats.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No organizations found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Across All Orgs */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity (All Organizations)
              </CardTitle>
              <CardDescription>Latest changes across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          activity.event_type === 'created' ? 'bg-green-500' :
                          activity.event_type === 'updated' ? 'bg-blue-500' :
                          activity.event_type === 'deleted' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {activity.event_type?.replace(/_/g, ' ')} - {activity.entity_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.entity_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity found
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
