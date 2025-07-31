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
import { CalendarIcon, Download, Filter, RefreshCw, BarChart3, PieChart, TrendingUp, Users, Activity, Target, DollarSign, MapPin } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bar, BarChart, Line, LineChart, Pie, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AnalyticsData {
  totalChildren: number;
  totalActivities: number;
  totalPrograms: number;
  totalStaff: number;
  monthlyGrowth: Array<{ month: string; children: number; activities: number }>;
  programDistribution: Array<{ name: string; value: number; color: string }>;
  performanceMetrics: Array<{ metric: string; value: number; target: number; status: 'above' | 'below' | 'on-track' }>;
  locationData: Array<{ location: string; count: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

export default function ReportsAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchPrograms();
    generateAnalytics();
  }, []);

  useEffect(() => {
    generateAnalytics();
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

  const generateAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch children data
      let childrenQuery = supabase.from('children').select('*');
      if (dateRange?.from) {
        childrenQuery = childrenQuery.gte('enrollment_date', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        childrenQuery = childrenQuery.lte('enrollment_date', dateRange.to.toISOString());
      }
      if (selectedLocation !== 'all') {
        childrenQuery = childrenQuery.eq('residence', selectedLocation as any);
      }

      // Fetch activities data
      let activitiesQuery = supabase.from('activities').select('*, children(*)');
      if (dateRange?.from) {
        activitiesQuery = activitiesQuery.gte('activity_date', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        activitiesQuery = activitiesQuery.lte('activity_date', dateRange.to.toISOString());
      }

      // Fetch child programs data
      let childProgramsQuery = supabase.from('child_programs').select('*, children(*), programs(*)');
      if (selectedProgram !== 'all') {
        childProgramsQuery = childProgramsQuery.eq('program_id', selectedProgram);
      }

      const [childrenResult, activitiesResult, childProgramsResult, programsResult, staffResult] = await Promise.all([
        childrenQuery,
        activitiesQuery,
        childProgramsQuery,
        supabase.from('programs').select('*').eq('is_active', true),
        supabase.from('profiles').select('*')
      ]);

      if (childrenResult.error) throw childrenResult.error;
      if (activitiesResult.error) throw activitiesResult.error;
      if (childProgramsResult.error) throw childProgramsResult.error;
      if (programsResult.error) throw programsResult.error;
      if (staffResult.error) throw staffResult.error;

      const children = childrenResult.data || [];
      const activities = activitiesResult.data || [];
      const childPrograms = childProgramsResult.data || [];
      const allPrograms = programsResult.data || [];
      const staff = staffResult.data || [];

      // Calculate monthly growth
      const monthlyData = {};
      children.forEach(child => {
        const month = format(new Date(child.enrollment_date), 'MMM yyyy');
        if (!monthlyData[month]) {
          monthlyData[month] = { children: 0, activities: 0 };
        }
        monthlyData[month].children++;
      });

      activities.forEach(activity => {
        const month = format(new Date(activity.activity_date), 'MMM yyyy');
        if (!monthlyData[month]) {
          monthlyData[month] = { children: 0, activities: 0 };
        }
        monthlyData[month].activities++;
      });

      const monthlyGrowth = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...(data as { children: number; activities: number })
      }));

      // Calculate program distribution
      const programCounts = {};
      childPrograms.forEach(cp => {
        const programName = cp.programs?.name || 'Unknown';
        programCounts[programName] = (programCounts[programName] || 0) + 1;
      });

      const programDistribution = Object.entries(programCounts).map(([name, value], index) => ({
        name,
        value: value as number,
        color: COLORS[index % COLORS.length]
      }));

      // Calculate location data
      const locationCounts = {};
      children.forEach(child => {
        const location = child.residence || 'Unknown';
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      });

      const locationData = Object.entries(locationCounts).map(([location, count]) => ({
        location,
        count: count as number
      }));

      // Calculate performance metrics
      const totalTarget = 1000; // Example target
      const performanceMetrics = [
        {
          metric: 'Children Enrolled',
          value: children.length,
          target: totalTarget,
          status: (children.length >= totalTarget ? 'above' : children.length >= totalTarget * 0.8 ? 'on-track' : 'below') as 'above' | 'below' | 'on-track'
        },
        {
          metric: 'Activities Completed',
          value: activities.length,
          target: 500,
          status: (activities.length >= 500 ? 'above' : activities.length >= 400 ? 'on-track' : 'below') as 'above' | 'below' | 'on-track'
        },
        {
          metric: 'Program Enrollments',
          value: childPrograms.length,
          target: 300,
          status: (childPrograms.length >= 300 ? 'above' : childPrograms.length >= 240 ? 'on-track' : 'below') as 'above' | 'below' | 'on-track'
        }
      ];

      setAnalyticsData({
        totalChildren: children.length,
        totalActivities: activities.length,
        totalPrograms: allPrograms.length,
        totalStaff: staff.length,
        monthlyGrowth,
        programDistribution,
        performanceMetrics,
        locationData
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
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Dynamic insights and comprehensive reporting</p>
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
          <Button onClick={generateAnalytics}>
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
            <CardTitle className="text-sm font-medium">Total Children</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalChildren || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalActivities || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalPrograms || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalStaff || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Growth</CardTitle>
                <CardDescription>Children enrollment and activity trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData?.monthlyGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="children" stroke="hsl(var(--primary))" name="Children" />
                    <Line type="monotone" dataKey="activities" stroke="hsl(var(--secondary))" name="Activities" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Program Distribution</CardTitle>
                <CardDescription>Children enrolled by program</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData?.programDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData?.programDistribution?.map((entry, index) => (
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

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Trends</CardTitle>
              <CardDescription>Historical data showing enrollment patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData?.monthlyGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="children" fill="hsl(var(--primary))" name="New Enrollments" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Program Performance</CardTitle>
              <CardDescription>Detailed breakdown by program</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.programDistribution?.map((program, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: program.color }} />
                      <span className="font-medium">{program.name}</span>
                    </div>
                    <Badge variant="secondary">{program.value} children</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Key performance indicators against targets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.performanceMetrics?.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{metric.metric}</div>
                        <div className="text-sm text-muted-foreground">
                          {metric.value} / {metric.target} target
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        metric.status === 'above' ? 'default' : 
                        metric.status === 'on-track' ? 'secondary' : 
                        'destructive'
                      }
                    >
                      {metric.status === 'above' ? 'Above Target' : 
                       metric.status === 'on-track' ? 'On Track' : 
                       'Below Target'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>Children distribution by location</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData?.locationData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="location" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}