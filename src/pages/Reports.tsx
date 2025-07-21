import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Users, TrendingUp, BarChart3, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export default function Reports() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [dateRange, setDateRange] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch real-time statistics
  const { data: realtimeStats, isLoading: statsLoading } = useQuery({
    queryKey: ['reports-stats'],
    queryFn: async () => {
      const [childrenRes, activitiesRes, enrollmentsRes, visitsRes] = await Promise.all([
        supabase.from('children').select('*', { count: 'exact' }).eq('status', 'active'),
        supabase.from('activities').select('*', { count: 'exact' }),
        supabase.from('child_programs').select('*', { count: 'exact' }),
        supabase.from('visits').select('*', { count: 'exact' })
      ]);

      return {
        totalChildren: childrenRes.count || 0,
        totalActivities: activitiesRes.count || 0,
        totalEnrollments: enrollmentsRes.count || 0,
        totalVisits: visitsRes.count || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    fetchPrograms();
    generateReport();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      // Fetch children count
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('id, status')
        .eq('status', 'active');

      if (childrenError) throw childrenError;

      // Fetch activities count
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, activity_date');

      if (activitiesError) throw activitiesError;

      // Fetch enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('child_programs')
        .select(`
          id,
          status,
          enrollment_date,
          completion_date,
          programs:program_id (name)
        `);

      if (enrollmentsError) throw enrollmentsError;

      // Fetch visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('id, visit_date');

      if (visitsError) throw visitsError;

      setReportData({
        totalChildren: childrenData?.length || 0,
        totalActivities: activitiesData?.length || 0,
        totalEnrollments: enrollmentsData?.length || 0,
        totalVisits: visitsData?.length || 0,
        programBreakdown: enrollmentsData?.reduce((acc, enrollment) => {
          const programName = enrollment.programs?.name || 'Unknown';
          acc[programName] = (acc[programName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        monthlyActivities: getMonthlyBreakdown(activitiesData || []),
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyBreakdown = (activities: any[]) => {
    const monthlyData: Record<string, number> = {};
    activities.forEach(activity => {
      const month = new Date(activity.activity_date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });
    return monthlyData;
  };

  const exportToPDF = async () => {
    // Dynamic import to keep bundle size smaller
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Heart 2 Heart - Program Report', 20, 20);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
    
    // Add summary statistics
    doc.setFontSize(16);
    doc.text('Summary Statistics', 20, 55);
    
    const summaryData = [
      ['Total Active Children', reportData?.totalChildren || 0],
      ['Total Activities', reportData?.totalActivities || 0],
      ['Total Program Enrollments', reportData?.totalEnrollments || 0],
      ['Total Visits', reportData?.totalVisits || 0],
    ];

    autoTable(doc, {
      startY: 65,
      head: [['Metric', 'Count']],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 10 },
    });

    // Add program breakdown
    if (reportData?.programBreakdown) {
      const lastTableY = (doc as any).lastAutoTable?.finalY || 120;
      doc.text('Program Enrollment Breakdown', 20, lastTableY + 20);
      
      const programData = Object.entries(reportData.programBreakdown).map(([program, count]) => [
        program,
        count
      ]);

      autoTable(doc, {
        startY: lastTableY + 30,
        head: [['Program', 'Enrollments']],
        body: programData,
        theme: 'grid',
        styles: { fontSize: 10 },
      });
    }

    // Save the PDF
    doc.save('heart-2-heart-report.pdf');
    
    toast({
      title: "Success",
      description: "Report exported successfully",
    });
  };

  if (loading && !reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and view program reports</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportToPDF} disabled={!reportData}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={generateReport} disabled={loading}>
            <BarChart3 className="h-4 w-4 mr-2" />
            {loading ? 'Generating...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <DatePickerWithRange
          date={dateRange}
          onDateChange={setDateRange}
          placeholder="Select date range"
        />

        <Button onClick={generateReport} disabled={loading}>
          Generate Report
        </Button>
      </div>

      {(reportData || realtimeStats) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Children</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : (reportData?.totalChildren || realtimeStats?.totalChildren || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Currently enrolled</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : (reportData?.totalActivities || realtimeStats?.totalActivities || 0)}
                </div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Program Enrollments</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : (reportData?.totalEnrollments || realtimeStats?.totalEnrollments || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Total enrollments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : (reportData?.totalVisits || realtimeStats?.totalVisits || 0)}
                </div>
                <p className="text-xs text-muted-foreground">All visits</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Program Enrollment Distribution</CardTitle>
                <CardDescription>Number of children enrolled in each program</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(reportData?.programBreakdown || {}).map(([program, count]) => (
                    <div key={program} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{program}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ 
                              width: `${((count as number) / Math.max(...Object.values(reportData?.programBreakdown || {}).map(v => v as number))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 text-right">{count as number}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Activity Trends</CardTitle>
                <CardDescription>Activities recorded per month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(reportData?.monthlyActivities || {}).slice(-6).map(([month, count]) => (
                    <div key={month} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{month}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-secondary rounded-full"
                            style={{ 
                              width: `${((count as number) / Math.max(...Object.values(reportData?.monthlyActivities || {}).map(v => v as number))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 text-right">{count as number}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>Quick access to recently generated reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => navigate('/reports/activity-reports')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Activity Reports
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => navigate('/reports/program-reports')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Program Reports
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => navigate('/reports/home-visits')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Home Visit Reports
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => navigate('/reports/school-visits')}
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    School Visit Reports
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Others (Administrative)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest program activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Total Activities: {statsLoading ? "..." : (realtimeStats?.totalActivities || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    This Month: {(Object.values(reportData?.monthlyActivities || {}).slice(-1)[0] as number) || 0}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/reports/activity-reports')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View All Activities
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Report Templates</CardTitle>
              <CardDescription>Generate specific reports for different purposes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => navigate('/reports/activity-reports')}
                >
                  <FileText className="h-6 w-6 mb-2" />
                  <span>Activity Reports</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => navigate('/reports/program-reports')}
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span>Program Summary</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => navigate('/reports/home-visits')}
                >
                  <BarChart3 className="h-6 w-6 mb-2" />
                  <span>Home Visit Reports</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => navigate('/reports/academic-performance')}
                >
                  <GraduationCap className="h-6 w-6 mb-2" />
                  <span>Academic Performance</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
