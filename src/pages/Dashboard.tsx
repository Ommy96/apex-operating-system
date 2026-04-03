import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useProgramEnrollmentStats } from "@/hooks/useProgramEnrollmentStats";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, TrendingUp, Target, Clock, Sparkles, Zap, Activity, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComplianceAlertBanner } from "@/components/ComplianceAlertBanner";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { 
  StatCard, WorkspacePanel, WorkspacePanelHeader,
} from "@/components/workspace";
import { DashboardTrendCharts } from "@/components/DashboardTrendCharts";
import { GlobalSearchBar } from "@/components/dashboard/GlobalSearchBar";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { QuickNavCards } from "@/components/dashboard/QuickNavCards";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { FloatingCreateButton } from "@/components/dashboard/FloatingCreateButton";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, isStaff, user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const { can } = usePermissions();
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

      {/* Compliance Alerts for admins */}
      {can.manageSettings && <ComplianceAlertBanner />}

      {/* Section 1 — Global Search */}
      <GlobalSearchBar />

      {/* Section 2 — Quick Actions */}
      <WorkspacePanel padding="md">
        <WorkspacePanelHeader 
          title="Quick Actions" 
          description="Perform common tasks without navigating away"
          actions={<Zap className="h-4 w-4 text-warning" />}
        />
        <div className="mt-4">
          <QuickActionsPanel />
        </div>
      </WorkspacePanel>

      {/* Section 3 — Key Metrics Overview */}
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
            description="Enrolled beneficiaries"
            icon={Target}
            variant={variants[(idx + 1) % variants.length]}
          />
        ))}
      </div>

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

      {/* Section 4 — Quick Navigation Cards */}
      <WorkspacePanel padding="md">
        <WorkspacePanelHeader title="Quick Navigation" description="Jump to any module" />
        <div className="mt-4">
          <QuickNavCards />
        </div>
      </WorkspacePanel>

      {/* Section 5 & 6 — Activity Feed & Alerts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WorkspacePanel padding="md">
          <WorkspacePanelHeader 
            title="Activity Feed" 
            description="Recent system activity"
            actions={<Activity className="h-4 w-4 text-muted-foreground" />}
          />
          <div className="mt-4">
            <ActivityFeed />
          </div>
        </WorkspacePanel>

        <WorkspacePanel padding="md">
          <WorkspacePanelHeader 
            title="Alerts & Notifications" 
            description="Items requiring attention"
            actions={<Bell className="h-4 w-4 text-muted-foreground" />}
          />
          <div className="mt-4">
            <AlertsPanel />
          </div>
        </WorkspacePanel>
      </div>

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

      {/* Floating Create Button */}
      <FloatingCreateButton />
    </div>
  );
};

export default Dashboard;
