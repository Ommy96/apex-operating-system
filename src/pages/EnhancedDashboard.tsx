import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  TrendingUp,
  FileText,
  Plus,
  Eye,
  Target,
  Filter,
  Settings,
  Activity,
  BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProgramEnrollmentStats } from "@/hooks/useProgramEnrollmentStats";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardCustomizer, DashboardWidget } from "@/components/DashboardCustomizer";
import { RealtimeIndicators } from "@/components/RealTimeIndicators";
import { AdvancedCharts } from "@/components/AdvancedCharts";
import { Toaster } from 'react-hot-toast';

const EnhancedDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [filters, setFilters] = useState<any>(null);
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const { programStats, totalBeneficiaries, statsLoading } = useProgramEnrollmentStats();

  const stats = [
    {
      title: "Total Beneficiaries",
      value: statsLoading ? "..." : totalBeneficiaries.toString(),
      description: "Active beneficiaries",
      icon: Users,
      gradient: "bg-gradient-primary",
      change: "Real-time data"
    },
    ...programStats.slice(0, 3).map(ps => ({
      title: ps.programName,
      value: statsLoading ? "..." : ps.count.toString(),
      description: "Enrolled beneficiaries",
      icon: Target,
      gradient: "bg-gradient-secondary",
      change: "Real-time data"
    }))
  ];

  const quickActions = isAdmin ? [
    { title: "Add Beneficiary", icon: Plus, variant: "default" as const, onClick: () => navigate('/beneficiaries') },
    { title: "View Analytics", icon: FileText, variant: "secondary" as const, onClick: () => navigate('/reports-analytics') },
    { title: "Manage Programs", icon: Target, variant: "accent" as const, onClick: () => navigate('/programs-management') }
  ] : [
    { title: "View Analytics", icon: Eye, variant: "outline" as const, onClick: () => navigate('/reports-analytics') },
    { title: "View Beneficiaries", icon: Users, variant: "accent" as const, onClick: () => navigate('/beneficiaries') }
  ];

  const dashboardWidgets: DashboardWidget[] = [
    {
      id: 'stats-overview',
      title: 'Statistics Overview',
      category: 'stats',
      defaultSize: { w: 12, h: 2 },
      minSize: { w: 6, h: 2 },
      resizable: true,
      visible: true,
      component: (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 h-full">
          {stats.map((stat, index) => {
            const cardGradients = ["bg-gradient-card-blue", "bg-gradient-card-emerald", "bg-gradient-card-orange", "bg-gradient-card-purple"];
            const cardBorders = ["border-card-blue", "border-card-emerald", "border-card-orange", "border-card-purple"];
            return (
              <Card key={stat.title} className={`${cardGradients[index % cardGradients.length]} ${cardBorders[index % cardBorders.length]} shadow-elevation-1 hover:shadow-elevation-3 transition-all duration-300`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <div className={`p-3 rounded-xl ${stat.gradient} shadow-elevation-2`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">{stat.value}</div>
                  <p className="text-sm text-muted-foreground mb-2">{stat.description}</p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gradient-accent rounded-full animate-pulse"></div>
                    <p className="text-xs text-success font-medium">{stat.change}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      category: 'actions',
      defaultSize: { w: 4, h: 2 },
      minSize: { w: 3, h: 2 },
      resizable: true,
      visible: true,
      component: (
        <Card className="shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Quick Actions</CardTitle>
            <CardDescription>Common tasks and operations</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Button key={action.title} variant={action.variant} className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 text-xs p-2 sm:p-4" onClick={action.onClick}>
                <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-center leading-tight">{action.title}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )
    },
    {
      id: 'realtime-indicators',
      title: 'Real-time Status',
      category: 'stats',
      defaultSize: { w: 4, h: 3 },
      minSize: { w: 3, h: 2 },
      resizable: true,
      visible: true,
      component: <RealtimeIndicators />
    },
    {
      id: 'advanced-charts',
      title: 'Advanced Analytics',
      category: 'charts',
      defaultSize: { w: 12, h: 4 },
      minSize: { w: 6, h: 3 },
      resizable: true,
      visible: true,
      component: <AdvancedCharts />
    }
  ];

  const handleFiltersChange = useCallback((newFilters: any) => { setFilters(newFilters); }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <Toaster position="top-right" />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Enhanced Dashboard - {userName}</h1>
        <p className="text-muted-foreground">Interactive analytics and real-time monitoring.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2"><Activity className="h-4 w-4" />Analytics</TabsTrigger>
          <TabsTrigger value="filters" className="flex items-center gap-2"><Filter className="h-4 w-4" />Filters</TabsTrigger>
          <TabsTrigger value="customize" className="flex items-center gap-2"><Settings className="h-4 w-4" />Customize</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <DashboardCustomizer widgets={dashboardWidgets} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AdvancedCharts />
        </TabsContent>

        <TabsContent value="filters" className="space-y-6">
          <DashboardFilters onFiltersChange={handleFiltersChange} />
          {filters && (
            <Card className="shadow-elevation-1">
              <CardHeader><CardTitle>Filtered Results</CardTitle><CardDescription>Data based on your current filter settings</CardDescription></CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.title} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{stat.title}</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="customize" className="space-y-6">
          <Card className="shadow-elevation-1">
            <CardHeader><CardTitle>Dashboard Customization</CardTitle><CardDescription>Drag and resize widgets to customize your view</CardDescription></CardHeader>
            <CardContent><DashboardCustomizer widgets={dashboardWidgets} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedDashboard;
