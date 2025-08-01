import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Download, Filter, RefreshCw, BarChart3, PieChart, TrendingUp, Users, Activity, Target, DollarSign, MapPin, FileText, Brain, ExternalLink, Eye } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bar, BarChart, Line, LineChart, Pie, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";

interface StaffReport {
  id: string;
  staff_name: string;
  report_type: string;
  created_at: string;
  location?: string;
  program_name?: string;
  status?: string;
}

interface ProgramLink {
  id: string;
  name: string;
  description: string;
  total_reports: number;
  route: string;
}

interface AnalyticsData {
  totalReports: number;
  totalPrograms: number;
  totalStaff: number;
  activeStaff: number;
  monthlyReports: Array<{ month: string; reports: number; staff: number }>;
  reportTypeDistribution: Array<{ name: string; value: number; color: string }>;
  locationDistribution: Array<{ location: string; count: number }>;
  aiInsights: Array<{ type: 'trend' | 'alert' | 'recommendation'; message: string; impact: 'high' | 'medium' | 'low' }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

export default function ReportsAnalytics() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [staffReports, setStaffReports] = useState<StaffReport[]>([]);
  const [programLinks, setProgramLinks] = useState<ProgramLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchPrograms();
    generateAnalytics();
    fetchStaffReports();
    fetchProgramLinks();
  }, []);

  useEffect(() => {
    generateAnalytics();
    fetchStaffReports();
  }, [dateRange, selectedProgram, selectedLocation]);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to fetch programs');
    }
  };

  const fetchStaffReports = async () => {
    try {
      const reports: StaffReport[] = [];
      
      // Fetch activity reports
      const { data: activityReports } = await supabase
        .from('activity_reports')
        .select('id, staff, created_at, program')
        .order('created_at', { ascending: false });
      
      activityReports?.forEach(report => {
        reports.push({
          id: report.id,
          staff_name: report.staff,
          report_type: 'Activity Report',
          created_at: report.created_at,
          program_name: report.program
        });
      });

      // Fetch home visit reports
      const { data: homeReports } = await supabase
        .from('home_visit_reports')
        .select('id, staff, created_at, location')
        .order('created_at', { ascending: false });
      
      homeReports?.forEach(report => {
        reports.push({
          id: report.id,
          staff_name: report.staff,
          report_type: 'Home Visit Report',
          created_at: report.created_at,
          location: report.location
        });
      });

      // Fetch school visit reports
      const { data: schoolReports } = await supabase
        .from('school_visit_reports')
        .select('id, staff, created_at, location')
        .order('created_at', { ascending: false });
      
      schoolReports?.forEach(report => {
        reports.push({
          id: report.id,
          staff_name: report.staff,
          report_type: 'School Visit Report',
          created_at: report.created_at,
          location: report.location
        });
      });

      // Fetch program reports
      const { data: programReports } = await supabase
        .from('program_reports')
        .select('id, staff, created_at, program')
        .order('created_at', { ascending: false });
      
      programReports?.forEach(report => {
        reports.push({
          id: report.id,
          staff_name: report.staff,
          report_type: 'Program Report',
          created_at: report.created_at,
          program_name: report.program
        });
      });

      // Sort by date and filter based on date range
      let filteredReports = reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      if (dateRange?.from) {
        filteredReports = filteredReports.filter(report => 
          new Date(report.created_at) >= dateRange.from!
        );
      }
      if (dateRange?.to) {
        filteredReports = filteredReports.filter(report => 
          new Date(report.created_at) <= dateRange.to!
        );
      }

      setStaffReports(filteredReports);
    } catch (error) {
      console.error('Error fetching staff reports:', error);
      toast.error('Failed to fetch staff reports');
    }
  };

  const fetchProgramLinks = async () => {
    try {
      const programRoutes: ProgramLink[] = [
        { id: '1', name: 'Children Management', description: 'Manage child profiles and enrollment', total_reports: 0, route: '/children' },
        { id: '2', name: 'Feeding Program', description: 'Track feeding program beneficiaries', total_reports: 0, route: '/feeding-program' },
        { id: '3', name: 'Family Adoption', description: 'Monitor family adoption cases', total_reports: 0, route: '/family-adoption' },
        { id: '4', name: 'Kipawa Sato (Talents)', description: 'Manage talent development program', total_reports: 0, route: '/kipawa-sato' },
        { id: '5', name: 'Self Empowerment', description: 'Track microfinance and self-empowerment', total_reports: 0, route: '/self-empowerment' },
        { id: '6', name: 'Support Groups', description: 'Manage community support groups', total_reports: 0, route: '/support-groups' },
        { id: '7', name: 'Activity Reports', description: 'View all activity reports', total_reports: 0, route: '/activity-reports' },
        { id: '8', name: 'Program Reports', description: 'View program-specific reports', total_reports: 0, route: '/program-reports' },
        { id: '9', name: 'Home Visit Reports', description: 'View home visit documentation', total_reports: 0, route: '/home-visit-reports' },
        { id: '10', name: 'School Visit Reports', description: 'View school visit documentation', total_reports: 0, route: '/school-visit-reports' }
      ];

      setProgramLinks(programRoutes);
    } catch (error) {
      console.error('Error fetching program links:', error);
    }
  };

  const generateAnalytics = async () => {
    setLoading(true);
    try {
      // Get all report counts
      const [activityReports, homeReports, schoolReports, programReports, profiles] = await Promise.all([
        supabase.from('activity_reports').select('id, created_at, staff'),
        supabase.from('home_visit_reports').select('id, created_at, staff'),
        supabase.from('school_visit_reports').select('id, created_at, staff'),
        supabase.from('program_reports').select('id, created_at, staff'),
        supabase.from('profiles').select('id, full_name')
      ]);

      const allReports = [
        ...(activityReports.data || []).map(r => ({ ...r, type: 'Activity Report' })),
        ...(homeReports.data || []).map(r => ({ ...r, type: 'Home Visit Report' })),
        ...(schoolReports.data || []).map(r => ({ ...r, type: 'School Visit Report' })),
        ...(programReports.data || []).map(r => ({ ...r, type: 'Program Report' }))
      ];

      // Calculate monthly reports
      const monthlyData = {};
      const staffSet = new Set();
      
      allReports.forEach(report => {
        const month = format(new Date(report.created_at), 'MMM yyyy');
        staffSet.add(report.staff);
        
        if (!monthlyData[month]) {
          monthlyData[month] = { reports: 0, staff: new Set() };
        }
        monthlyData[month].reports++;
        monthlyData[month].staff.add(report.staff);
      });

      const monthlyReports = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        reports: (data as any).reports,
        staff: (data as any).staff.size
      }));

      // Calculate report type distribution
      const typeCounts = {};
      allReports.forEach(report => {
        typeCounts[report.type] = (typeCounts[report.type] || 0) + 1;
      });

      const reportTypeDistribution = Object.entries(typeCounts).map(([name, value], index) => ({
        name,
        value: value as number,
        color: COLORS[index % COLORS.length]
      }));

      // Generate AI insights
      const aiInsights = [
        {
          type: 'trend' as const,
          message: `Report submissions have ${monthlyReports.length > 1 && monthlyReports[0].reports > monthlyReports[1].reports ? 'increased' : 'remained stable'} this month`,
          impact: 'medium' as const
        },
        {
          type: 'alert' as const,
          message: `${staffSet.size} staff members have submitted reports in the current period`,
          impact: 'low' as const
        },
        {
          type: 'recommendation' as const,
          message: 'Consider implementing automated report reminders to increase submission rates',
          impact: 'high' as const
        }
      ];

      setAnalyticsData({
        totalReports: allReports.length,
        totalPrograms: programLinks.length,
        totalStaff: profiles.data?.length || 0,
        activeStaff: staffSet.size,
        monthlyReports,
        reportTypeDistribution,
        locationDistribution: [],
        aiInsights
      });

    } catch (error) {
      console.error('Error generating analytics:', error);
      toast.error('Failed to generate analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'pdf') => {
    toast.info(`Exporting data as ${format.toUpperCase()}...`);
    // Implementation for export functionality
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive reporting hub with AI-powered insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportData('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportData('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => { generateAnalytics(); fetchStaffReports(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date-range">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="program">Program</Label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="rural">Rural</SelectItem>
                  <SelectItem value="urban">Urban</SelectItem>
                  <SelectItem value="semi_urban">Semi-Urban</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalReports || 0}</div>
            <p className="text-xs text-muted-foreground">All submitted reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.activeStaff || 0}</div>
            <p className="text-xs text-muted-foreground">Staff with recent reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{programLinks.length}</div>
            <p className="text-xs text-muted-foreground">Available programs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalStaff || 0}</div>
            <p className="text-xs text-muted-foreground">Registered staff members</p>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="staff-reports" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="staff-reports">Staff Reports</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="staff-reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Staff Report Submissions
              </CardTitle>
              <CardDescription>
                Track all staff report submissions with filtering capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 items-center">
                  <Input 
                    placeholder="Search by staff name..." 
                    className="max-w-sm"
                  />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Report Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="activity">Activity Reports</SelectItem>
                      <SelectItem value="home">Home Visit Reports</SelectItem>
                      <SelectItem value="school">School Visit Reports</SelectItem>
                      <SelectItem value="program">Program Reports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Report Type</TableHead>
                        <TableHead>Date Submitted</TableHead>
                        <TableHead>Program/Location</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffReports.slice(0, 10).map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.staff_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{report.report_type}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(report.created_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{report.program_name || report.location || '-'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Program Navigation Hub
              </CardTitle>
              <CardDescription>
                Central access point for all programs and reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programLinks.map((program) => (
                  <Card key={program.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(program.route)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{program.name}</CardTitle>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{program.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{program.total_reports} reports</Badge>
                        <Button variant="ghost" size="sm">
                          View <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Report Trends</CardTitle>
                <CardDescription>Report submissions and active staff over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData?.monthlyReports || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="reports" stroke="hsl(var(--primary))" name="Reports" />
                    <Line type="monotone" dataKey="staff" stroke="hsl(var(--secondary))" name="Active Staff" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Report Type Distribution</CardTitle>
                <CardDescription>Distribution of different report types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData?.reportTypeDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData?.reportTypeDistribution?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription>
                Automated analysis of trends, patterns, and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.aiInsights?.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      insight.impact === 'high' ? 'bg-red-500' : 
                      insight.impact === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={insight.type === 'alert' ? 'destructive' : insight.type === 'trend' ? 'default' : 'secondary'}>
                          {insight.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {insight.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm">{insight.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Report Submission Timeline</CardTitle>
                <CardDescription>Recent reporting activity across all programs</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.monthlyReports || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="reports" fill="hsl(var(--primary))" name="Total Reports" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Staff Activity Summary</CardTitle>
                <CardDescription>Key metrics and performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm font-medium">Average Reports per Staff</span>
                    <Badge variant="secondary">
                      {analyticsData?.activeStaff > 0 ? Math.round((analyticsData?.totalReports || 0) / analyticsData.activeStaff) : 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm font-medium">Most Active Report Type</span>
                    <Badge variant="secondary">
                      {analyticsData?.reportTypeDistribution?.[0]?.name || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm font-medium">Reporting Rate</span>
                    <Badge variant="secondary">
                      {analyticsData?.totalStaff > 0 ? Math.round(((analyticsData?.activeStaff || 0) / analyticsData.totalStaff) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}