import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Target,
  Filter,
  Settings,
  Activity,
  BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardCustomizer, DashboardWidget } from "@/components/DashboardCustomizer";
import { RealtimeIndicators } from "@/components/RealTimeIndicators";
import { AdvancedCharts } from "@/components/AdvancedCharts";
import { Toaster } from 'react-hot-toast';

const EnhancedDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [filters, setFilters] = useState<any>(null);
  
  // Extract user name from metadata or email
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  
  // Fetch dashboard statistics with real-time updates
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', filters],
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

  // Fetch beneficiaries distribution by location
  const { data: locationDistribution, isLoading: locationLoading } = useQuery({
    queryKey: ['location-distribution', filters],
    queryFn: async () => {
      // Get data from multiple sources
      const [childrenRes, feedingRes, kipawaRes, selfEmpowermentRes, familyAdoptionRes] = await Promise.all([
        supabase.from('children').select('residence'),
        supabase.from('feeding_program').select('id'),
        supabase.from('kipawa_sato').select('location'),
        supabase.from('self_empowerment').select('residence'),
        supabase.from('family_adoption').select('residence')
      ]);

      const locationCounts: { [key: string]: number } = {};

      // Count children by residence
      childrenRes.data?.forEach(child => {
        const location = child.residence || 'Not Specified';
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      });

      // Count feeding program participants (no location data)
      if (feedingRes.data?.length) {
        locationCounts['Not Specified'] = (locationCounts['Not Specified'] || 0) + feedingRes.data.length;
      }

      // Count Kipawa participants by location
      kipawaRes.data?.forEach(participant => {
        const location = participant.location || 'Not Specified';
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      });

      // Count self-empowerment participants by residence
      selfEmpowermentRes.data?.forEach(participant => {
        const location = participant.residence || 'Not Specified';
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      });

      // Count family adoption participants by residence
      familyAdoptionRes.data?.forEach(participant => {
        const location = participant.residence || 'Not Specified';
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      });

      // Convert to array and sort by count
      const total = Object.values(locationCounts).reduce((sum, count) => sum + count, 0);
      
      return Object.entries(locationCounts)
        .map(([location, count]) => ({
          location,
          count,
          percentage: total > 0 ? ((count / total) * 100).toFixed(1) : "0"
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Show top 8 locations
    },
    refetchInterval: 30000,
  });

  const stats = [
    {
      title: "Total Beneficiaries",
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

  // Define dashboard widgets
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-3 rounded-xl ${stat.gradient} shadow-elevation-2`}>
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
                    <div className="w-2 h-2 bg-gradient-accent rounded-full animate-pulse"></div>
                    <p className="text-xs text-success font-medium">
                      {stat.change}
                    </p>
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
      )
    },
    {
      id: 'location-distribution',
      title: 'Location Distribution',
      category: 'charts',
      defaultSize: { w: 8, h: 3 },
      minSize: { w: 6, h: 2 },
      resizable: true,
      visible: true,
      component: (
        <Card className="shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Beneficiaries by Location
            </CardTitle>
            <CardDescription>
              Geographic distribution of all program participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locationLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />
                        <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                      </div>
                      <div className="h-4 bg-muted rounded w-16 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : locationDistribution && locationDistribution.length > 0 ? (
                locationDistribution.slice(0, 5).map((location, index) => {
                  const colors = [
                    'bg-gradient-to-r from-primary to-primary/80',
                    'bg-gradient-to-r from-accent to-accent/80', 
                    'bg-gradient-to-r from-secondary to-secondary/80',
                    'bg-gradient-to-r from-warning to-warning/80',
                    'bg-gradient-to-r from-success to-success/80'
                  ];
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-background to-secondary/10 hover:from-secondary/20 hover:to-secondary/30 transition-all duration-300 border border-border/50">
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-xl ${colors[index % colors.length]}`}></div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            {location.location}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {location.percentage}% of total beneficiaries
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xl text-foreground">{location.count}</span>
                        <p className="text-xs text-muted-foreground">beneficiaries</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p>No location data available</p>
                </div>
              )}
            </div>
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

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  const handleDataUpdate = useCallback((source: string, data: any) => {
    console.log('Data updated from source:', source, data);
    // Could trigger specific actions based on the data source
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <Toaster position="top-right" />
      
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Enhanced Dashboard - {userName}
        </h1>
        <p className="text-muted-foreground">
          Interactive analytics and real-time monitoring for Heart to Heart Organization.
        </p>
      </div>

      {/* Tabs for different dashboard views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="filters" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </TabsTrigger>
          <TabsTrigger value="customize" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Customize
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Customizable Dashboard */}
          <DashboardCustomizer
            widgets={dashboardWidgets}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Advanced Charts */}
          <AdvancedCharts />
        </TabsContent>

        <TabsContent value="filters" className="space-y-6">
          {/* Filters Interface */}
          <DashboardFilters onFiltersChange={handleFiltersChange} />
          
          {/* Filtered Results Preview */}
          {filters && (
            <Card className="shadow-elevation-1">
              <CardHeader>
                <CardTitle>Filtered Results</CardTitle>
                <CardDescription>
                  Data based on your current filter settings
                </CardDescription>
              </CardHeader>
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
          {/* Real-time Indicators */}
          <RealtimeIndicators onDataUpdate={handleDataUpdate} />
          
          {/* Customization Info */}
          <Card className="shadow-elevation-1">
            <CardHeader>
              <CardTitle>Dashboard Customization</CardTitle>
              <CardDescription>
                Personalize your dashboard experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Available Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Drag and drop widgets</li>
                    <li>• Resize components</li>
                    <li>• Save custom layouts</li>
                    <li>• Toggle widget visibility</li>
                    <li>• Real-time data updates</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Advanced Analytics</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Activity heatmaps</li>
                    <li>• Trend sparklines</li>
                    <li>• Comparison charts</li>
                    <li>• Progress indicators</li>
                    <li>• Calendar views</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedDashboard;