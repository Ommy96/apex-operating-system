import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useProgramEnrollmentStats } from "@/hooks/useProgramEnrollmentStats";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  TrendingUp,
  FileText,
  Eye,
  BookOpen,
  Clock,
  Target,
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
import { DashboardTrendCharts } from "@/components/DashboardTrendCharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, isStaff, user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const {
    programStats,
    totalBeneficiaries,
    trendData,
    statsLoading,
    trendsLoading,
    refetch,
  } = useProgramEnrollmentStats();

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard_beneficiaries_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beneficiaries' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'New Beneficiary Added',
              description: 'A new beneficiary record has been created',
              duration: 3000,
            });
          }
          refetch();
          setLastUpdated(new Date());
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beneficiary_services' },
        () => {
          refetch();
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch, toast]);

  const quickActions = [
    { title: "Beneficiaries", path: "/beneficiaries", icon: Users, color: "bg-primary/10 text-primary" },
    { title: "Programs", path: "/programs-management", icon: Target, color: "bg-accent/10 text-accent" },
    { title: "Documents", path: "/documents", icon: FileText, color: "bg-info/10 text-info" },
    { title: "Analytics", path: "/reports-analytics", icon: TrendingUp, color: "bg-warning/10 text-warning" },
  ];

  const recentReports = [
    { name: "Monthly Program Report", path: "/reports-analytics", icon: BookOpen },
    { name: "Beneficiary Overview", path: "/beneficiaries", icon: Users },
    { name: "Program Analytics", path: "/reports-analytics", icon: TrendingUp },
    { name: "Document Compliance", path: "/documents", icon: FileText },
  ];

  // Variant cycling for stat cards
  const variants: Array<"primary" | "info" | "success" | "warning"> = ["primary", "info", "success", "warning"];

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

      {/* Stats Cards - Total + dynamic programs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Beneficiaries"
          value={statsLoading ? "..." : totalBeneficiaries.toString()}
          description="Active individuals served"
          icon={Users}
          variant="primary"
        />
        {programStats.slice(0, 3).map((ps, idx) => (
          <StatCard
            key={ps.programId}
            title={ps.programName}
            value={statsLoading ? "..." : ps.count.toString()}
            description={`Enrolled beneficiaries`}
            icon={Target}
            variant={variants[(idx + 1) % variants.length]}
          />
        ))}
      </div>

      {/* Show more programs if > 3 */}
      {programStats.length > 3 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {programStats.slice(3).map((ps, idx) => (
            <StatCard
              key={ps.programId}
              title={ps.programName}
              value={statsLoading ? "..." : ps.count.toString()}
              description="Enrolled beneficiaries"
              icon={Target}
              variant={variants[idx % variants.length]}
            />
          ))}
        </div>
      )}

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
            programStats={programStats}
            trendData={trendData}
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
