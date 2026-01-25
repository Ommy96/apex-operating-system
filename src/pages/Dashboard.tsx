import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  GraduationCap, 
  UtensilsCrossed, 
  Heart,
  TrendingUp,
  FileText,
  Plus,
  Eye,
  BookOpen,
  Sparkles,
  Clock,
  LayoutDashboard
} from "lucide-react";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { StaffPermissionsDemo } from "@/components/StaffPermissionsDemo";
import { LiveUserPresence } from "@/components/LiveUserPresence";
import { ActivityFeed } from "@/components/ActivityFeed";
import { RealTimeIndicator } from "@/components/RealTimeIndicator";
import { useToast } from "@/hooks/use-toast";
import { DashboardTrendCharts, type TrendData } from "@/components/DashboardTrendCharts";
import { format, startOfMonth, subMonths } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, isStaff, user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  // State for real-time features
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Extract user name from metadata or email
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const organizationId = currentOrganization?.organization_id;
  
  // Fetch dashboard statistics with real-time updates every 30 seconds
  const { data: dashboardStats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      // Fetch program counts and unique beneficiary count in parallel
      const [childrenRes, feedingRes, kipawaRes, selfEmpowermentRes, uniqueCountRes] = await Promise.all([
        supabase.from('children').select('*', { count: 'exact' }).eq('organization_id', organizationId).not('academic_level', 'is', null),
        supabase.from('feeding_program').select('*', { count: 'exact' }).eq('organization_id', organizationId),
        supabase.from('kipawa_sato').select('*', { count: 'exact' }).eq('organization_id', organizationId),
        supabase.from('self_empowerment').select('*', { count: 'exact' }).eq('organization_id', organizationId),
        supabase.rpc('get_unique_beneficiary_count', { _org_id: organizationId }),
      ]);

      // Use the unique count from the database function
      const uniqueBeneficiaryCount = uniqueCountRes.data as number || 0;

      return {
        totalChildren: uniqueBeneficiaryCount,
        educationProgram: childrenRes.count || 0,
        feedingProgram: feedingRes.count || 0,
        kipawaProgram: kipawaRes.count || 0,
        empowermentProgram: selfEmpowermentRes.count || 0
      };
    },
    enabled: !!organizationId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: dashboardTrendData, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard-trends', organizationId],
    queryFn: async (): Promise<TrendData[]> => {
      if (!organizationId) return [];

      const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
      const monthLabels = months.map(d => format(d, 'MMM'));
      const monthIndex = new Map(monthLabels.map((m, idx) => [m, idx] as const));

      const startDateIso = months[0].toISOString();

      const [educationRes, feedingRes, kipawaRes, empowermentRes] = await Promise.all([
        supabase
          .from('children')
          .select('enrollment_date')
          .eq('organization_id', organizationId)
          .gte('enrollment_date', startDateIso),
        supabase
          .from('feeding_program')
          .select('created_at')
          .eq('organization_id', organizationId)
          .gte('created_at', startDateIso),
        supabase
          .from('kipawa_sato')
          .select('created_at')
          .eq('organization_id', organizationId)
          .gte('created_at', startDateIso),
        supabase
          .from('self_empowerment')
          .select('created_at')
          .eq('organization_id', organizationId)
          .gte('created_at', startDateIso),
      ]);

      const safeRows = <T,>(res: { data: T[] | null; error: any }) => (res.error ? [] : (res.data ?? []));
      const countByMonth = (rows: any[], dateKey: string) => {
        const counts = new Array(6).fill(0);
        for (const r of rows) {
          const raw = r?.[dateKey];
          if (!raw) continue;
          const label = format(new Date(raw), 'MMM');
          const idx = monthIndex.get(label);
          if (idx === undefined) continue;
          counts[idx] += 1;
        }
        return counts;
      };

      const educationCounts = countByMonth(safeRows(educationRes), 'enrollment_date');
      const feedingCounts = countByMonth(safeRows(feedingRes), 'created_at');
      const kipawaCounts = countByMonth(safeRows(kipawaRes), 'created_at');
      const empowermentCounts = countByMonth(safeRows(empowermentRes), 'created_at');

      return monthLabels.map((month, i) => ({
        month,
        education: educationCounts[i] ?? 0,
        feeding: feedingCounts[i] ?? 0,
        kipawa: kipawaCounts[i] ?? 0,
        empowerment: empowermentCounts[i] ?? 0,
      }));
    },
    enabled: !!organizationId,
    refetchInterval: 30000,
  });


  // Set up real-time subscriptions for dashboard activity
  useEffect(() => {
    if (!user) return;

    // Multiple database change subscriptions for comprehensive activity tracking
    const tables = [
      { name: 'children', displayName: 'Child' },
      { name: 'alumni', displayName: 'Alumni' },
      { name: 'feeding_program', displayName: 'Feeding Program' },
      { name: 'kipawa_sato', displayName: 'Kipawa Program' },
      { name: 'self_empowerment', displayName: 'Self Empowerment' },
      { name: 'activities', displayName: 'Activity' },
      { name: 'program_reports', displayName: 'Program Report' },
      { name: 'activity_reports', displayName: 'Activity Report' }
    ];

    const channels = tables.map(table => {
      const channel = supabase
        .channel(`dashboard_${table.name}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table.name
          },
          (payload) => {
            console.log(`${table.displayName} change detected:`, payload);
            
            // Show notification for different events
            if (payload.eventType === 'INSERT') {
              toast({
                title: `🎉 New ${table.displayName} Added!`,
                description: `A new ${table.displayName.toLowerCase()} record has been created`,
                duration: 4000,
              });
              
              // Add to recent activity
              setRecentActivity(prev => [{
                id: Date.now(),
                type: 'added',
                entity_name: table.displayName,
                user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'System',
                created_at: new Date().toISOString()
              }, ...prev.slice(0, 9)]);
            } else if (payload.eventType === 'UPDATE') {
              toast({
                title: `📝 ${table.displayName} Updated`,
                description: `A ${table.displayName.toLowerCase()} record has been updated`,
                duration: 3000,
              });
              
              setRecentActivity(prev => [{
                id: Date.now(),
                type: 'updated',
                entity_name: table.displayName,
                user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'System',
                created_at: new Date().toISOString()
              }, ...prev.slice(0, 9)]);
            } else if (payload.eventType === 'DELETE') {
              toast({
                title: `🗑️ ${table.displayName} Removed`,
                description: `A ${table.displayName.toLowerCase()} record has been deleted`,
                duration: 3000,
              });
              
              setRecentActivity(prev => [{
                id: Date.now(),
                type: 'deleted',
                entity_name: table.displayName,
                user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'System',
                created_at: new Date().toISOString()
              }, ...prev.slice(0, 9)]);
            }
            
            // Refresh the dashboard data
            refetch();
            setLastUpdated(new Date());
          }
        )
        .subscribe();

      return channel;
    });

    // Cleanup function
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, refetch, toast]);

  const stats = [
    {
      title: "Unique Beneficiaries",
      value: statsLoading ? "..." : dashboardStats?.totalChildren.toString() || "0",
      description: "Distinct individuals served",
      icon: Users,
      gradient: "bg-gradient-primary",
      change: "Deduplicated count"
    },
    {
      title: "Education Program",
      value: statsLoading ? "..." : dashboardStats?.educationProgram.toString() || "0",
      description: "Children in school",
      icon: GraduationCap,
      gradient: "bg-gradient-secondary",
      change: "Real-time data"
    },
    {
      title: "Feeding Program",
      value: statsLoading ? "..." : dashboardStats?.feedingProgram.toString() || "0",
      description: "Children enrolled",
      icon: UtensilsCrossed,
      gradient: "bg-gradient-warm",
      change: "Real-time data"
    },
    {
      title: "Kipawa Program",
      value: statsLoading ? "..." : dashboardStats?.kipawaProgram.toString() || "0",
      description: "Talent development",
      icon: Heart,
      gradient: "bg-accent",
      change: "Real-time data"
    }
  ];

  const quickActions = isAdmin ? [
    { 
      title: "Add New Child", 
      icon: Plus, 
      variant: "default" as const,
      onClick: () => navigate('/children')
    },
    { 
      title: "Submit Report", 
      icon: FileText, 
      variant: "secondary" as const,
      onClick: () => navigate('/reports')
    },
    { 
      title: "Schedule Visit", 
      icon: Users, 
      variant: "accent" as const,
      onClick: () => navigate('/children')
    }
  ] : [
    { 
      title: "View Reports", 
      icon: Eye, 
      variant: "outline" as const,
      onClick: () => navigate('/reports')
    },
    { 
      title: "View Children", 
      icon: Users, 
      variant: "accent" as const,
      onClick: () => navigate('/children')
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Modern Hero Header */}
      <PageHeroHeader
        title={`Welcome back, ${userName}`}
        description="Here's what's happening with Heart to Heart Organization today."
        icon={LayoutDashboard}
        iconColorClass="bg-gradient-to-br from-primary to-accent text-white"
        stats={[
          { label: "Total Beneficiaries", value: statsLoading ? "..." : dashboardStats?.totalChildren.toString() || "0" },
          { label: "Education", value: statsLoading ? "..." : dashboardStats?.educationProgram.toString() || "0" },
          { label: "Feeding", value: statsLoading ? "..." : dashboardStats?.feedingProgram.toString() || "0" },
          { label: "Kipawa", value: statsLoading ? "..." : dashboardStats?.kipawaProgram.toString() || "0" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex">
              <RealTimeIndicator 
                isConnected={true} 
                lastUpdate={lastUpdated}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
        }
      />


      {/* Role-based Permissions Demo - Hidden for staff and admin users */}
      {!isStaff && !isAdmin && (
        <div className="mb-8">
          <StaffPermissionsDemo />
        </div>
      )}

      {/* Quick Actions - Navigation Card - Hidden for staff and admin users */}
      {!isStaff && !isAdmin && (
        <Card className="shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks and operations
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.title}
                variant={action.variant}
                className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 text-xs p-2 sm:p-4 hover-lift button-press"
                onClick={action.onClick}
              >
                <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-center leading-tight">{action.title}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Animated Trend Charts Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Program Analytics & Trends
        </h2>
        <DashboardTrendCharts 
          stats={{
            educationProgram: dashboardStats?.educationProgram || 0,
            feedingProgram: dashboardStats?.feedingProgram || 0,
            kipawaProgram: dashboardStats?.kipawaProgram || 0,
            empowermentProgram: dashboardStats?.empowermentProgram || 0
          }}
          trendData={dashboardTrendData}
          isLoading={statsLoading || trendsLoading}
        />
      </div>

      {/* Report Actions Card - Hidden for staff and admin users */}
        {!isStaff && !isAdmin && (
          <Card className="shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300">
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                Latest program reports and visits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                 {[
                  { name: "Monthly Education Report", path: "/reports/program-reports", icon: BookOpen, color: "text-primary" },
                  { name: "Alumni Success Stories", path: "/alumni", icon: GraduationCap, color: "text-secondary" },
                  { name: "Feeding Program Update", path: "/reports/activity-reports", icon: UtensilsCrossed, color: "text-accent" },
                  { name: "Home Visit Summary", path: "/reports/home-visits", icon: Users, color: "text-warning" }
                ].map((report, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-muted/20 to-muted/40 hover:from-muted/30 hover:to-muted/60 transition-all duration-200 border border-muted/50 cursor-pointer group hover-lift micro-interaction shadow-elevation-1 hover:shadow-elevation-2"
                    onClick={() => navigate(report.path)}
                  >
                    <div className="flex items-center gap-3">
                      <report.icon className={`h-4 w-4 ${report.color}`} />
                      <span className="text-sm font-medium">{report.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="group-hover:bg-primary/10 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(report.path);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4 bg-gradient-to-r from-accent/10 to-primary/10 hover:from-accent/20 hover:to-primary/20 border-accent/30"
                onClick={() => navigate('/alumni')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                View Alumni Directory
              </Button>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default Dashboard;