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
  Calendar,
  BookOpen,
  Sparkles,
  Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  
  // Extract user name from metadata or email
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  
  // Fetch dashboard statistics with real-time updates every 30 seconds
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [childrenRes, feedingRes, kipawaRes, selfEmpowermentRes] = await Promise.all([
        supabase.from('children').select('*', { count: 'exact' }),
        supabase.from('feeding_program').select('*', { count: 'exact' }),
        supabase.from('kipawa_sato').select('*', { count: 'exact' }),
        supabase.from('self_empowerment').select('*', { count: 'exact' })
      ]);

      const totalChildrenFromAllPrograms = (childrenRes.count || 0) + 
                                          (feedingRes.count || 0) + 
                                          (kipawaRes.count || 0) + 
                                          (selfEmpowermentRes.count || 0);

      return {
        totalChildren: totalChildrenFromAllPrograms,
        educationProgram: childrenRes.count || 0,
        feedingProgram: feedingRes.count || 0,
        kipawaProgram: kipawaRes.count || 0,
        empowermentProgram: selfEmpowermentRes.count || 0
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent activities with real-time updates
  const { data: recentActivities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const activities = [];

      // Get recent children additions
      const { data: newChildren } = await supabase
        .from('children')
        .select('first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      // Get recent reports submissions
      const [programReports, homeVisitReports, activityReports, schoolVisitReports] = await Promise.all([
        supabase.from('program_reports').select('created_at, program').order('created_at', { ascending: false }).limit(1),
        supabase.from('home_visit_reports').select('created_at, location').order('created_at', { ascending: false }).limit(1),
        supabase.from('activity_reports').select('created_at, program').order('created_at', { ascending: false }).limit(1),
        supabase.from('school_visit_reports').select('created_at, school').order('created_at', { ascending: false }).limit(1)
      ]);

      // Add children activities
      newChildren?.forEach(child => {
        activities.push({
          title: "New Child Added",
          description: `${child.first_name} ${child.last_name} has been added to the system`,
          time: new Date(child.created_at).toLocaleString(),
          type: 'success' as const,
          timestamp: new Date(child.created_at)
        });
      });

      // Add report activities
      programReports?.data?.forEach(report => {
        activities.push({
          title: "Program Report Submitted",
          description: `${report.program} program report has been submitted`,
          time: new Date(report.created_at).toLocaleString(),
          type: 'success' as const,
          timestamp: new Date(report.created_at)
        });
      });

      homeVisitReports?.data?.forEach(report => {
        activities.push({
          title: "Home Visit Report Submitted",
          description: `Home visit report for ${report.location || 'location'} has been submitted`,
          time: new Date(report.created_at).toLocaleString(),
          type: 'success' as const,
          timestamp: new Date(report.created_at)
        });
      });

      activityReports?.data?.forEach(report => {
        activities.push({
          title: "Activity Report Submitted",
          description: `${report.program} activity report has been submitted`,
          time: new Date(report.created_at).toLocaleString(),
          type: 'success' as const,
          timestamp: new Date(report.created_at)
        });
      });

      schoolVisitReports?.data?.forEach(report => {
        activities.push({
          title: "School Visit Report Submitted",
          description: `School visit report for ${report.school} has been submitted`,
          time: new Date(report.created_at).toLocaleString(),
          type: 'success' as const,
          timestamp: new Date(report.created_at)
        });
      });

      // Sort by timestamp and return latest 4
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 4)
        .map(({ timestamp, ...activity }) => activity);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate program distribution percentages
  const totalPrograms = (dashboardStats?.educationProgram || 0) + 
                       (dashboardStats?.feedingProgram || 0) + 
                       (dashboardStats?.kipawaProgram || 0) + 
                       (dashboardStats?.empowermentProgram || 0);

  const programDistribution = [
    {
      name: "Education Program",
      count: dashboardStats?.educationProgram || 0,
      percentage: totalPrograms > 0 ? ((dashboardStats?.educationProgram || 0) / totalPrograms * 100).toFixed(1) : "0",
      color: "bg-gradient-primary",
      textColor: "text-primary"
    },
    {
      name: "Feeding Program", 
      count: dashboardStats?.feedingProgram || 0,
      percentage: totalPrograms > 0 ? ((dashboardStats?.feedingProgram || 0) / totalPrograms * 100).toFixed(1) : "0",
      color: "bg-gradient-secondary",
      textColor: "text-secondary"
    },
    {
      name: "Kipawa Program",
      count: dashboardStats?.kipawaProgram || 0,
      percentage: totalPrograms > 0 ? ((dashboardStats?.kipawaProgram || 0) / totalPrograms * 100).toFixed(1) : "0",
      color: "bg-gradient-warm",
      textColor: "text-accent"
    },
    {
      name: "Empowerment",
      count: dashboardStats?.empowermentProgram || 0,
      percentage: totalPrograms > 0 ? ((dashboardStats?.empowermentProgram || 0) / totalPrograms * 100).toFixed(1) : "0",
      color: "bg-warning",
      textColor: "text-warning"
    }
  ];

  const stats = [
    {
      title: "Total Children",
      value: statsLoading ? "..." : dashboardStats?.totalChildren.toString() || "0",
      description: "Active beneficiaries",
      icon: Users,
      gradient: "bg-gradient-primary",
      change: "Real-time data"
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
      title: "View Reports", 
      icon: Eye, 
      variant: "outline" as const,
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
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, {userName}
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with Heart to Heart Organization today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={stat.title} className="bg-gradient-card border-white/20 shadow-strong hover:shadow-medium transition-all duration-300 animate-scale-in backdrop-blur-sm" style={{animationDelay: `${index * 100}ms`}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-3 rounded-xl ${stat.gradient} shadow-medium`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">
                {stat.value}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {stat.description}
              </p>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gradient-secondary rounded-full animate-pulse"></div>
                <p className="text-xs text-success font-medium">
                  {stat.change}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks and operations
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <Button
                key={action.title}
                variant={action.variant}
                className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 text-xs p-2 sm:p-4"
                onClick={action.onClick}
              >
                <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-center leading-tight">{action.title}</span>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Recent Activities
            </CardTitle>
            <CardDescription>
              Latest updates from all programs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activitiesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-2 h-2 rounded-full mt-2 bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivities && recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-muted/30 to-muted/50 hover:from-muted/50 hover:to-muted/70 transition-all duration-200 border border-muted">
                    <div className={`w-3 h-3 rounded-full mt-2 shadow-sm ${
                      activity.type === 'success' ? 'bg-gradient-to-r from-success to-success/80' :
                      activity.type === 'warning' ? 'bg-gradient-to-r from-warning to-warning/80' :
                      'bg-gradient-to-r from-primary to-primary/80'
                    }`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-primary font-medium">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p>No recent activities found</p>
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4 bg-gradient-to-r from-primary/5 to-secondary/5 hover:from-primary/10 hover:to-secondary/10 border-primary/20"
              onClick={() => navigate('/reports/activity-reports')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              View All Activities
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Program Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Program Distribution</CardTitle>
            <CardDescription>
              Children enrolled by program type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-muted rounded-full animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                      </div>
                      <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                programDistribution.map((program, index) => (
                  <div key={program.name} className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-background to-muted/30 hover:from-muted/20 hover:to-muted/40 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full shadow-sm ${program.color}`}></div>
                      <span className={`text-sm font-medium ${program.textColor}`}>{program.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground">{program.count}</span>
                      <span className="text-xs text-muted-foreground ml-1">({program.percentage}%)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
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
                { name: "Feeding Program Update", path: "/reports/activity-reports", icon: UtensilsCrossed, color: "text-secondary" },
                { name: "Home Visit Summary", path: "/reports/home-visits", icon: Users, color: "text-accent" },
                { name: "Kipawa Progress Report", path: "/reports/activity-reports", icon: Heart, color: "text-warning" }
              ].map((report, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-muted/20 to-muted/40 hover:from-muted/30 hover:to-muted/60 transition-all duration-200 border border-muted/50 cursor-pointer group"
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
              onClick={() => navigate('/reports')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              View All Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;