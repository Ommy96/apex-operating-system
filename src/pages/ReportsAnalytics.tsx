import { useState, useEffect, useMemo } from "react";
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Download, Filter, RefreshCw, BarChart3, PieChart, TrendingUp, Users, Activity, Target, DollarSign, MapPin, FileText, Brain, ExternalLink, Eye, ArrowUpDown, Search, AlertCircle } from "lucide-react";
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
  const [selectedReportType, setSelectedReportType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [allStaffReports, setAllStaffReports] = useState<StaffReport[]>([]);
  const [programLinks, setProgramLinks] = useState<ProgramLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [programs, setPrograms] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

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

  // Filtered and sorted staff reports
  const filteredStaffReports = useMemo(() => {
    let filtered = [...allStaffReports];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(report => 
        report.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.report_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.program_name && report.program_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (report.location && report.location.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply report type filter
    if (selectedReportType !== "all") {
      filtered = filtered.filter(report => {
        switch (selectedReportType) {
          case "activity": return report.report_type === "Activity Report";
          case "home": return report.report_type === "Home Visit Report";
          case "school": return report.report_type === "School Visit Report";
          case "program": return report.report_type === "Program Report";
          default: return true;
        }
      });
    }

    // Apply program filter
    if (selectedProgram !== "all") {
      const programName = programs.find(p => p.id === selectedProgram)?.name;
      if (programName) {
        filtered = filtered.filter(report => report.program_name === programName);
      }
    }

    // Apply location filter
    if (selectedLocation !== "all") {
      filtered = filtered.filter(report => report.location === selectedLocation);
    }

    // Apply date range filter
    if (dateRange?.from) {
      filtered = filtered.filter(report => 
        new Date(report.created_at) >= dateRange.from!
      );
    }
    if (dateRange?.to) {
      filtered = filtered.filter(report => 
        new Date(report.created_at) <= dateRange.to!
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof StaffReport] || "";
      let bValue: any = b[sortField as keyof StaffReport] || "";
      
      if (sortField === "created_at") {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [allStaffReports, searchQuery, selectedReportType, selectedProgram, selectedLocation, dateRange, sortField, sortDirection, programs]);

  // Paginated reports
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredStaffReports.slice(startIndex, startIndex + pageSize);
  }, [filteredStaffReports, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredStaffReports.length / pageSize);

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
      setError(null);
      const reports: StaffReport[] = [];
      
      // Use Promise.all for better performance
      const [activityReports, homeReports, schoolReports, programReports] = await Promise.all([
        supabase.from('activity_reports').select('id, staff, created_at, program').order('created_at', { ascending: false }),
        supabase.from('home_visit_reports').select('id, staff, created_at, location').order('created_at', { ascending: false }),
        supabase.from('school_visit_reports').select('id, staff, created_at, location').order('created_at', { ascending: false }),
        supabase.from('program_reports').select('id, staff, created_at, program').order('created_at', { ascending: false })
      ]);

      // Check for errors
      if (activityReports.error) throw activityReports.error;
      if (homeReports.error) throw homeReports.error;
      if (schoolReports.error) throw schoolReports.error;
      if (programReports.error) throw programReports.error;
      
      // Process activity reports
      activityReports.data?.forEach(report => {
        reports.push({
          id: report.id,
          staff_name: report.staff,
          report_type: 'Activity Report',
          created_at: report.created_at,
          program_name: report.program
        });
      });

      // Process home visit reports
      homeReports.data?.forEach(report => {
        reports.push({
          id: report.id,
          staff_name: report.staff,
          report_type: 'Home Visit Report',
          created_at: report.created_at,
          location: report.location
        });
      });

      // Process school visit reports
      schoolReports.data?.forEach(report => {
        reports.push({
          id: report.id,
          staff_name: report.staff,
          report_type: 'School Visit Report',
          created_at: report.created_at,
          location: report.location
        });
      });

      // Process program reports
      programReports.data?.forEach(report => {
        reports.push({
          id: report.id,
          staff_name: report.staff,
          report_type: 'Program Report',
          created_at: report.created_at,
          program_name: report.program
        });
      });

      // Sort by date
      const sortedReports = reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllStaffReports(sortedReports);
    } catch (error) {
      console.error('Error fetching staff reports:', error);
      setError('Failed to fetch staff reports');
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
    setExporting(true);
    try {
      toast.info(`Exporting data as ${format.toUpperCase()}...`);
      
      if (format === 'csv') {
        // Create CSV content
        const headers = ['Staff Member', 'Report Type', 'Date Submitted', 'Program/Location'];
        const csvContent = [
          headers.join(','),
          ...filteredStaffReports.map(report => [
            `"${report.staff_name}"`,
            `"${report.report_type}"`,
            `"${new Date(report.created_at).toLocaleDateString()}"`,
            `"${report.program_name || report.location || '-'}"`
          ].join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('CSV exported successfully!');
      } else {
        // For PDF export, we'll use a simple approach
        toast.info('PDF export functionality will be implemented with a PDF library');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        generateAnalytics(), 
        fetchStaffReports()
      ]);
      toast.success('Data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const viewReport = (report: StaffReport) => {
    // Navigate to appropriate report page based on report type
    switch (report.report_type) {
      case 'Activity Report':
        navigate('/activity-reports');
        break;
      case 'Home Visit Report':
        navigate('/home-visit-reports');
        break;
      case 'School Visit Report':
        navigate('/school-visit-reports');
        break;
      case 'Program Report':
        navigate('/program-reports');
        break;
      default:
        toast.info('Report details will be shown here');
    }
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setSelectedProgram("all");
    setSelectedLocation("all");
    setSelectedReportType("all");
    setSearchQuery("");
    setCurrentPage(1);
    toast.success('Filters cleared');
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
          <Button variant="outline" onClick={() => exportData('csv')} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="outline" onClick={() => exportData('pdf')} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    className="pointer-events-auto"
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

            <div>
              <Label>Actions</Label>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Filter Summary */}
          {(dateRange || selectedProgram !== "all" || selectedLocation !== "all" || selectedReportType !== "all" || searchQuery) && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Active Filters:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {dateRange && (
                  <Badge variant="secondary">
                    Date: {format(dateRange.from!, "MMM dd")} - {dateRange.to ? format(dateRange.to, "MMM dd") : "Present"}
                  </Badge>
                )}
                {selectedProgram !== "all" && (
                  <Badge variant="secondary">
                    Program: {programs.find(p => p.id === selectedProgram)?.name}
                  </Badge>
                )}
                {selectedLocation !== "all" && (
                  <Badge variant="secondary">Location: {selectedLocation}</Badge>
                )}
                {selectedReportType !== "all" && (
                  <Badge variant="secondary">Type: {selectedReportType}</Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary">Search: "{searchQuery}"</Badge>
                )}
              </div>
            </div>
          )}
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
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search by staff name, report type..." 
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                    <SelectTrigger className="w-full sm:w-48">
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

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {filteredStaffReports.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No reports found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters or search criteria</p>
                  </div>
                )}
                
                {filteredStaffReports.length > 0 && (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">
                      Showing {paginatedReports.length} of {filteredStaffReports.length} reports
                    </div>
                    
                    <div className="border rounded-lg">
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleSort('staff_name')}
                                  className="hover:bg-transparent p-0 h-auto font-medium"
                                >
                                  Staff Member
                                  <ArrowUpDown className="ml-2 h-3 w-3" />
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleSort('report_type')}
                                  className="hover:bg-transparent p-0 h-auto font-medium"
                                >
                                  Report Type
                                  <ArrowUpDown className="ml-2 h-3 w-3" />
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleSort('created_at')}
                                  className="hover:bg-transparent p-0 h-auto font-medium"
                                >
                                  Date Submitted
                                  <ArrowUpDown className="ml-2 h-3 w-3" />
                                </Button>
                              </TableHead>
                              <TableHead>Program/Location</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedReports.map((report) => (
                              <TableRow key={report.id}>
                                <TableCell className="font-medium">{report.staff_name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{report.report_type}</Badge>
                                </TableCell>
                                <TableCell>{format(new Date(report.created_at), 'MMM dd, yyyy')}</TableCell>
                                <TableCell>{report.program_name || report.location || '-'}</TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => viewReport(report)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(pageNum)}
                                  isActive={currentPage === pageNum}
                                  className="cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                )}
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
                  <Card 
                    key={program.id} 
                    className="hover:shadow-md transition-all hover:scale-105 cursor-pointer group" 
                    onClick={() => {
                      toast.info(`Navigating to ${program.name}...`);
                      navigate(program.route);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{program.name}</CardTitle>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{program.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{program.total_reports} reports</Badge>
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          navigate(program.route);
                        }}>
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