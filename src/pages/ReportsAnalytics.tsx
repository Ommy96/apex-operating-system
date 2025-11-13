import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Download, Search, Users, FileText, Home, AlertCircle, 
  MapPin, TrendingUp, TrendingDown, Calendar, Filter,
  BookOpen, Utensils, Heart, Building2, UserCheck
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bar, BarChart, Line, LineChart, Pie, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCardStyles } from "@/lib/cardStyles";
import { downloadExcel } from "@/lib/downloadUtils";

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

interface Report {
  id: string;
  type: string;
  staff: string;
  program: string;
  date: string;
  status: string;
  location?: string;
}

interface BeneficiaryProfile {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  residence: string;
  guardian_name: string;
  guardian_phone: string;
  status: string;
  programs: string[];
  reports: any[];
}

export default function ReportsAnalytics() {
  const { isAdmin, isManagement, userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryProfile | null>(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [reportTypeFilter, setReportTypeFilter] = useState("all");

  // Fetch Dashboard Summary Data
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      try {
        const [childrenRes, programsRes, reportsRes, visitsRes] = await Promise.all([
          supabase.from("children").select("id, gender, residence, status"),
          supabase.from("programs").select("id, is_active"),
          supabase.from("activity_reports").select("id, created_at"),
          supabase.from("home_visit_reports").select("id, visit_date")
        ]);

        if (childrenRes.error) throw childrenRes.error;
        if (programsRes.error) throw programsRes.error;
        if (reportsRes.error) throw reportsRes.error;
        if (visitsRes.error) throw visitsRes.error;

        const currentMonth = new Date();
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        const reportsThisMonth = reportsRes.data?.filter(r => {
          const date = new Date(r.created_at);
          return date >= monthStart && date <= monthEnd;
        }).length || 0;

        const visitsThisMonth = visitsRes.data?.filter(v => {
          const date = new Date(v.visit_date);
          return date >= monthStart && date <= monthEnd;
        }).length || 0;

        const maleCount = childrenRes.data?.filter(c => c.gender === 'Male').length || 0;
        const femaleCount = childrenRes.data?.filter(c => c.gender === 'Female').length || 0;

        return {
          totalBeneficiaries: childrenRes.data?.length || 0,
          maleCount,
          femaleCount,
          activePrograms: programsRes.data?.filter(p => p.is_active).length || 0,
          reportsThisMonth,
          visitsThisMonth
        };
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
        toast.error('Failed to load dashboard summary');
        throw error;
      }
    }
  });

  // Fetch Charts Data
  const { data: chartsData, isLoading: isChartsLoading, error: chartsError } = useQuery({
    queryKey: ["charts-data"],
    queryFn: async () => {
      try {
        // Reports over time (last 6 months)
        const sixMonthsAgo = subMonths(new Date(), 6);
        const [activityReports, programReports, homeVisits, schoolVisits] = await Promise.all([
          supabase.from("activity_reports").select("created_at").gte("created_at", sixMonthsAgo.toISOString()),
          supabase.from("program_reports").select("created_at").gte("created_at", sixMonthsAgo.toISOString()),
          supabase.from("home_visit_reports").select("visit_date").gte("visit_date", sixMonthsAgo.toISOString()),
          supabase.from("school_visit_reports").select("visit_date").gte("visit_date", sixMonthsAgo.toISOString())
        ]);

        // Group by month
        const monthlyData: Record<string, number> = {};
        const processReports = (reports: any[], dateField: string) => {
          reports?.forEach(r => {
            const month = format(new Date(r[dateField]), "MMM yyyy");
            monthlyData[month] = (monthlyData[month] || 0) + 1;
          });
        };

        processReports(activityReports.data || [], "created_at");
        processReports(programReports.data || [], "created_at");
        processReports(homeVisits.data || [], "visit_date");
        processReports(schoolVisits.data || [], "visit_date");

        const reportsTimeline = Object.entries(monthlyData)
          .map(([month, count]) => ({ month, reports: count }))
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        // Program Performance
        const [children, feeding, family, kipawa] = await Promise.all([
          supabase.from("children").select("id"),
          supabase.from("feeding_program").select("id"),
          supabase.from("family_adoption").select("id"),
          supabase.from("kipawa_sato").select("id")
        ]);

        const programPerformance = [
          { name: "Education", value: children.data?.length || 0 },
          { name: "Feeding", value: feeding.data?.length || 0 },
          { name: "Family Adoption", value: family.data?.length || 0 },
          { name: "Kipawa Sato", value: kipawa.data?.length || 0 }
        ];

        // Location Distribution
        const childrenWithLocation = await supabase.from("children").select("residence");
        const locationDist = childrenWithLocation.data?.reduce((acc, c) => {
          const loc = c.residence || "Unknown";
          acc[loc] = (acc[loc] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const locationDistribution = Object.entries(locationDist || {}).map(([location, count]) => ({
          location,
          count: count as number
        }));

        return {
          reportsTimeline,
          programPerformance,
          locationDistribution
        };
      } catch (error) {
        console.error('Charts data fetch error:', error);
        toast.error('Failed to load charts data');
        throw error;
      }
    }
  });

  // Fetch Reports Table Data
  const { data: reportsData, isLoading: isReportsLoading, error: reportsError, refetch: refetchReports } = useQuery({
    queryKey: ["reports-table", dateFilter, programFilter, locationFilter, reportTypeFilter],
    queryFn: async () => {
      try {
        let reports: Report[] = [];

        // Fetch different report types
        if (reportTypeFilter === "all" || reportTypeFilter === "activity") {
          const { data } = await supabase
            .from("activity_reports")
            .select("id, staff, program, reporting_date, created_at")
            .order("reporting_date", { ascending: false });
          
          reports.push(...(data?.map(r => ({
            id: r.id,
            type: "Activity Report",
            staff: r.staff,
            program: r.program,
            date: r.reporting_date,
            status: "Submitted"
          })) || []));
        }

        if (reportTypeFilter === "all" || reportTypeFilter === "program") {
          const { data } = await supabase
            .from("program_reports")
            .select("id, staff, program, reporting_date, created_at")
            .order("reporting_date", { ascending: false });
          
          reports.push(...(data?.map(r => ({
            id: r.id,
            type: "Program Report",
            staff: r.staff,
            program: r.program,
            date: r.reporting_date,
            status: "Submitted"
          })) || []));
        }

        if (reportTypeFilter === "all" || reportTypeFilter === "home") {
          const { data } = await supabase
            .from("home_visit_reports")
            .select("id, staff, location, visit_date, created_at")
            .order("visit_date", { ascending: false });
          
          reports.push(...(data?.map(r => ({
            id: r.id,
            type: "Home Visit",
            staff: r.staff,
            program: "Home Visit Program",
            date: r.visit_date,
            status: "Submitted",
            location: r.location
          })) || []));
        }

        if (reportTypeFilter === "all" || reportTypeFilter === "school") {
          const { data } = await supabase
            .from("school_visit_reports")
            .select("id, staff, location, visit_date, created_at")
            .order("visit_date", { ascending: false });
          
          reports.push(...(data?.map(r => ({
            id: r.id,
            type: "School Visit",
            staff: r.staff,
            program: "School Visit Program",
            date: r.visit_date,
            status: "Submitted",
            location: r.location
          })) || []));
        }

        // Apply filters
        if (locationFilter !== "all") {
          reports = reports.filter(r => r.location === locationFilter);
        }

        return reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } catch (error) {
        console.error('Reports data fetch error:', error);
        toast.error('Failed to load reports table');
        throw error;
      }
    }
  });

  // Fetch Alerts & Recommendations
  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const currentMonth = new Date();
      const lastMonth = subMonths(currentMonth, 1);
      const threeMonthsAgo = subMonths(currentMonth, 3);

      // Get current and last month report counts
      const [currentReports, lastMonthReports, homeVisits] = await Promise.all([
        supabase.from("activity_reports").select("id").gte("created_at", startOfMonth(currentMonth).toISOString()),
        supabase.from("activity_reports").select("id").gte("created_at", startOfMonth(lastMonth).toISOString()).lt("created_at", startOfMonth(currentMonth).toISOString()),
        supabase.from("home_visit_reports").select("visit_date, location").gte("visit_date", threeMonthsAgo.toISOString())
      ]);

      const currentCount = currentReports.data?.length || 0;
      const lastCount = lastMonthReports.data?.length || 0;
      const percentChange = lastCount > 0 ? ((currentCount - lastCount) / lastCount * 100).toFixed(1) : "0";

      // Check for locations not visited
      const allChildren = await supabase.from("children").select("residence");
      const visitedLocations = new Set(homeVisits.data?.map(v => v.location));
      const allLocations = new Set(allChildren.data?.map(c => c.residence));
      const unvisitedLocations = Array.from(allLocations).filter(loc => !visitedLocations.has(loc));

      return [
        {
          type: "trend" as const,
          message: `Reports ${Number(percentChange) >= 0 ? "increased" : "decreased"} by ${Math.abs(Number(percentChange))}% compared to last month.`,
          impact: Math.abs(Number(percentChange)) > 20 ? "high" : "medium" as const,
          icon: Number(percentChange) >= 0 ? TrendingUp : TrendingDown
        },
        ...(unvisitedLocations.length > 0 ? [{
          type: "alert" as const,
          message: `${unvisitedLocations.length} location(s) not visited this quarter: ${unvisitedLocations.join(", ")}`,
          impact: "high" as const,
          icon: AlertCircle
        }] : []),
        {
          type: "recommendation" as const,
          message: "Consider scheduling quarterly reviews with all program coordinators.",
          impact: "medium" as const,
          icon: Calendar
        }
      ];
    }
  });

  // Search Beneficiary
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    const { data: children, error } = await supabase
      .from("children")
      .select("*")
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,guardian_phone.ilike.%${searchQuery}%`);

    if (error) {
      toast.error("Error searching beneficiaries");
      return;
    }

    if (children && children.length > 0) {
      const child = children[0];
      
      // Fetch related reports
      const [homeVisits, schoolVisits] = await Promise.all([
        supabase.from("home_visit_reports").select("*").eq("student_id", child.id),
        supabase.from("visits").select("*").eq("child_id", child.id)
      ]);

      setSelectedBeneficiary({
        id: child.id,
        first_name: child.first_name,
        last_name: child.last_name,
        gender: child.gender,
        date_of_birth: child.date_of_birth,
        residence: child.residence,
        guardian_name: child.guardian_name,
        guardian_phone: child.guardian_phone,
        status: child.status,
        programs: [child.academic_level || "Education"],
        reports: [...(homeVisits.data || []), ...(schoolVisits.data || [])]
      });
    } else {
      toast.error("No beneficiary found");
    }
  };

  // Export functionality
  const handleExport = () => {
    if (!reportsData) return;

    const exportData = reportsData.map(r => ({
      "Report Type": r.type,
      "Staff Name": r.staff,
      "Program": r.program,
      "Date": format(new Date(r.date), "MMM dd, yyyy"),
      "Status": r.status,
      "Location": r.location || "N/A"
    }));

    downloadExcel(exportData, "reports-analytics", "Reports");
    toast.success("Report exported successfully");
  };

  // Show loading state
  if (isDashboardLoading || isChartsLoading || isReportsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (dashboardError || chartsError || reportsError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Failed to Load Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We encountered an error while loading the analytics data. Please try again.
            </p>
            {(dashboardError || chartsError || reportsError) && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs font-mono break-all">
                  {(dashboardError as Error)?.message || 
                   (chartsError as Error)?.message || 
                   (reportsError as Error)?.message}
                </p>
              </div>
            )}
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive insights into programs and beneficiaries</p>
        </div>
        <Button onClick={handleExport} className="gap-2" disabled={!reportsData}>
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={getCardStyles(0)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Beneficiaries</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData?.totalBeneficiaries || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {dashboardData?.maleCount || 0} Male • {dashboardData?.femaleCount || 0} Female
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles(1)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData?.activePrograms || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">Education, Feeding, Family Support</p>
          </CardContent>
        </Card>

        <Card className={getCardStyles(2)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reports This Month</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData?.reportsThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">Activity & Program reports</p>
          </CardContent>
        </Card>

        <Card className={getCardStyles(3)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Home Visits</CardTitle>
            <Home className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData?.visitsThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">Completed this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Beneficiary Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Beneficiary Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name, ID, or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>

          {selectedBeneficiary && (
            <div className="mt-6 p-6 border rounded-lg bg-muted/50">
              <h3 className="text-xl font-bold mb-4">
                {selectedBeneficiary.first_name} {selectedBeneficiary.last_name}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium">{selectedBeneficiary.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedBeneficiary.residence}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guardian</p>
                  <p className="font-medium">{selectedBeneficiary.guardian_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedBeneficiary.guardian_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge>{selectedBeneficiary.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reports</p>
                  <p className="font-medium">{selectedBeneficiary.reports.length} total</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts & Recommendations */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alerts & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, idx) => {
                const Icon = alert.icon;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-4 rounded-lg ${
                      alert.impact === "high"
                        ? "bg-destructive/10 border-destructive/20"
                        : alert.impact === "medium"
                        ? "bg-yellow-500/10 border-yellow-500/20"
                        : "bg-muted"
                    } border`}
                  >
                    <Icon className="h-5 w-5 mt-0.5" />
                    <p className="text-sm flex-1">{alert.message}</p>
                    <Badge variant={alert.impact === "high" ? "destructive" : "secondary"}>
                      {alert.impact}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts & Visual Analytics */}
      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Reports Timeline</TabsTrigger>
          <TabsTrigger value="programs">Program Performance</TabsTrigger>
          <TabsTrigger value="locations">Location Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports Submitted Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartsData?.reportsTimeline || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="reports"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Program Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartsData?.programPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Beneficiary Distribution by Location</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={chartsData?.locationDistribution || []}
                    dataKey="count"
                    nameKey="location"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {chartsData?.locationDistribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reporting Insights Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submitted Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reports</SelectItem>
                <SelectItem value="activity">Activity Reports</SelectItem>
                <SelectItem value="program">Program Reports</SelectItem>
                <SelectItem value="home">Home Visits</SelectItem>
                <SelectItem value="school">School Visits</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="kibera">Kibera</SelectItem>
                <SelectItem value="kawangware">Kawangware</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => refetchReports()}>
              <Filter className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Table */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsData?.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.type}</TableCell>
                    <TableCell>{report.staff}</TableCell>
                    <TableCell>{report.program}</TableCell>
                    <TableCell>{format(new Date(report.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{report.status}</Badge>
                    </TableCell>
                    <TableCell>{report.location || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}