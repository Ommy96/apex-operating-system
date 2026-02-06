import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, subMonths } from "date-fns";
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
  Clock,
  LayoutDashboard,
  Target,
  Activity,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  PageHeader, 
  StatCard, 
  WorkspacePanel, 
  WorkspacePanelHeader,
  StatusBadge,
} from "@/components/workspace";
import { DashboardTrendCharts, type TrendData } from "@/components/DashboardTrendCharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, isStaff, user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const organizationId = currentOrganization?.organization_id;
  
  // Fetch dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const [childrenRes, feedingRes, kipawaRes, selfEmpowermentRes, uniqueCountRes] = await Promise.all([
        supabase.from('children').select('*', { count: 'exact' }).eq('organization_id', organizationId).not('academic_level', 'is', null),
        supabase.from('feeding_program').select('*', { count: 'exact' }).eq('organization_id', organizationId),
        supabase.from('kipawa_sato').select('*', { count: 'exact' }).eq('organization_id', organizationId),
        supabase.from('self_empowerment').select('*', { count: 'exact' }).eq('organization_id', organizationId),
        supabase.rpc('get_unique_beneficiary_count', { _org_id: organizationId }),
      ]);

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
    refetchInterval: 30000,
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

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const tables = [
      { name: 'children', displayName: 'Child' },
      { name: 'alumni', displayName: 'Alumni' },
      { name: 'feeding_program', displayName: 'Feeding Program' },
      { name: 'kipawa_sato', displayName: 'Kipawa Program' },
      { name: 'self_empowerment', displayName: 'Self Empowerment' },
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
            if (payload.eventType === 'INSERT') {
              toast({
                title: `New ${table.displayName} Added`,
                description: `A new ${table.displayName.toLowerCase()} record has been created`,
                duration: 3000,
              });
            }
            refetch();
            setLastUpdated(new Date());
          }
        )
        .subscribe();

      return channel;
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, refetch, toast]);

  const quickActions = [
    { title: "Beneficiaries", path: "/beneficiaries", icon: Users, color: "bg-primary/10 text-primary" },
    { title: "Programs", path: "/programs-management", icon: Target, color: "bg-accent/10 text-accent" },
    { title: "Children", path: "/children", icon: GraduationCap, color: "bg-info/10 text-info" },
    { title: "Analytics", path: "/reports-analytics", icon: TrendingUp, color: "bg-warning/10 text-warning" },
  ];

  const recentReports = [
    { name: "Monthly Education Report", path: "/reports-analytics", icon: BookOpen },
    { name: "Alumni Success Stories", path: "/children/alumni", icon: GraduationCap },
    { name: "Feeding Program Update", path: "/programs/feeding", icon: UtensilsCrossed },
    { name: "Home Visit Summary", path: "/reports-analytics", icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {userName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your organization today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse-soft" />
          <Clock className="h-3.5 w-3.5" />
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Unique Beneficiaries"
          value={statsLoading ? "..." : dashboardStats?.totalChildren.toString() || "0"}
          description="Distinct individuals served"
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Education Program"
          value={statsLoading ? "..." : dashboardStats?.educationProgram.toString() || "0"}
          description="Children in school"
          icon={GraduationCap}
          variant="info"
        />
        <StatCard
          title="Feeding Program"
          value={statsLoading ? "..." : dashboardStats?.feedingProgram.toString() || "0"}
          description="Children enrolled"
          icon={UtensilsCrossed}
          variant="success"
        />
        <StatCard
          title="Kipawa Program"
          value={statsLoading ? "..." : dashboardStats?.kipawaProgram.toString() || "0"}
          description="Talent development"
          icon={Heart}
          variant="warning"
        />
      </div>

      {/* Quick Navigation */}
      <WorkspacePanel padding="md">
        <WorkspacePanelHeader title="Quick Navigation" description="Jump to frequently used sections" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                  {action.title}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </WorkspacePanel>

      {/* Analytics Charts */}
      <WorkspacePanel padding="md">
        <WorkspacePanelHeader 
          title="Program Analytics & Trends" 
          description="6-month enrollment trends across programs"
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate('/reports-analytics')}>
              View Details
            </Button>
          }
        />
        <div className="mt-4">
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
      </WorkspacePanel>

      {/* Recent Reports - Admin/Management only */}
      {(isAdmin || !isStaff) && (
        <WorkspacePanel padding="md">
          <WorkspacePanelHeader 
            title="Recent Reports" 
            description="Latest program reports and updates"
            actions={
              <Button variant="outline" size="sm" onClick={() => navigate('/reports-analytics')}>
                <Sparkles className="h-4 w-4 mr-1.5" />
                View All
              </Button>
            }
          />
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {recentReports.map((report, index) => (
              <button
                key={index}
                onClick={() => navigate(report.path)}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group text-left"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <report.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {report.name}
                </span>
                <Eye className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        </WorkspacePanel>
      )}
    </div>
  );
};

export default Dashboard;
