import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Award,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Download,
  Activity,
  BarChart3
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, Line, LineChart, Area, AreaChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { format, startOfMonth, subMonths, eachMonthOfInterval, isWithinInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { DateRange } from "react-day-picker";
import { downloadExcel } from "@/lib/downloadUtils";
import { toast } from "sonner";

interface StaffPerformanceSectionProps {
  reportsData: {
    homeVisits: any[];
    schoolVisits: any[];
    programReports: any[];
    activityReports: any[];
    businessVisits: any[];
  } | null;
  dateRange: DateRange | undefined;
  isLoading: boolean;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];

export function StaffPerformanceSection({ reportsData, dateRange, isLoading }: StaffPerformanceSectionProps) {
  // Aggregate all staff activities
  const staffMetrics = useMemo(() => {
    if (!reportsData) return [];
    
    const staffData: Record<string, {
      name: string;
      homeVisits: number;
      schoolVisits: number;
      programReports: number;
      activityReports: number;
      businessVisits: number;
      total: number;
      activeDays: Set<string>;
    }> = {};

    const processReports = (reports: any[], type: keyof typeof staffData[string]) => {
      reports.forEach(r => {
        const staff = r.staff || 'Unknown';
        if (!staffData[staff]) {
          staffData[staff] = {
            name: staff,
            homeVisits: 0,
            schoolVisits: 0,
            programReports: 0,
            activityReports: 0,
            businessVisits: 0,
            total: 0,
            activeDays: new Set()
          };
        }
        if (typeof type === 'string' && type !== 'total' && type !== 'activeDays' && type !== 'name') {
          (staffData[staff] as any)[type]++;
        }
        staffData[staff].total++;
        const date = format(new Date(r.created_at), 'yyyy-MM-dd');
        staffData[staff].activeDays.add(date);
      });
    };

    processReports(reportsData.homeVisits, 'homeVisits');
    processReports(reportsData.schoolVisits, 'schoolVisits');
    processReports(reportsData.programReports, 'programReports');
    processReports(reportsData.activityReports, 'activityReports');
    processReports(reportsData.businessVisits || [], 'businessVisits');

    return Object.values(staffData)
      .map(s => ({
        ...s,
        activeDaysCount: s.activeDays.size,
        consistency: Math.min(100, Math.round((s.activeDays.size / 30) * 100))
      }))
      .sort((a, b) => b.total - a.total);
  }, [reportsData]);

  // Top performers
  const topPerformers = useMemo(() => {
    return staffMetrics.slice(0, 5);
  }, [staffMetrics]);

  // Activity heatmap data (weekly)
  const weeklyActivity = useMemo(() => {
    if (!reportsData) return [];
    
    const weeks = eachWeekOfInterval({
      start: subMonths(new Date(), 2),
      end: new Date()
    }).slice(-8);

    return weeks.map(week => {
      const weekStart = startOfWeek(week);
      const weekEnd = endOfWeek(week);
      
      const countInWeek = (reports: any[]) => 
        reports.filter(r => {
          const date = new Date(r.created_at);
          return isWithinInterval(date, { start: weekStart, end: weekEnd });
        }).length;

      const totalReports = 
        countInWeek(reportsData.homeVisits) +
        countInWeek(reportsData.schoolVisits) +
        countInWeek(reportsData.programReports) +
        countInWeek(reportsData.activityReports);

      return {
        week: format(weekStart, 'MMM d'),
        reports: totalReports
      };
    });
  }, [reportsData]);

  // Staff radar comparison (top 4)
  const radarData = useMemo(() => {
    const top4 = staffMetrics.slice(0, 4);
    const maxTotal = Math.max(...top4.map(s => s.total), 1);
    
    return top4.map(staff => ({
      name: staff.name.split(' ')[0],
      homeVisits: Math.round((staff.homeVisits / maxTotal) * 100),
      schoolVisits: Math.round((staff.schoolVisits / maxTotal) * 100),
      programReports: Math.round((staff.programReports / maxTotal) * 100),
      activityReports: Math.round((staff.activityReports / maxTotal) * 100),
      consistency: staff.consistency
    }));
  }, [staffMetrics]);

  // Monthly engagement trends
  const monthlyEngagement = useMemo(() => {
    if (!reportsData) return [];
    
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const countInMonth = (reports: any[]) => 
        reports.filter(r => {
          const date = new Date(r.created_at);
          return isWithinInterval(date, { start: monthStart, end: monthEnd });
        }).length;

      const uniqueStaff = new Set<string>();
      [...reportsData.homeVisits, ...reportsData.schoolVisits, ...reportsData.programReports, ...reportsData.activityReports]
        .filter(r => {
          const date = new Date(r.created_at);
          return isWithinInterval(date, { start: monthStart, end: monthEnd });
        })
        .forEach(r => uniqueStaff.add(r.staff || 'Unknown'));

      return {
        month: format(month, 'MMM'),
        activeStaff: uniqueStaff.size,
        totalReports: countInMonth(reportsData.homeVisits) +
                      countInMonth(reportsData.schoolVisits) +
                      countInMonth(reportsData.programReports) +
                      countInMonth(reportsData.activityReports)
      };
    });
  }, [reportsData]);

  // Export staff performance
  const handleExport = () => {
    if (!staffMetrics.length) {
      toast.error("No staff data to export");
      return;
    }

    const exportData = staffMetrics.map(staff => ({
      "Staff Name": staff.name,
      "Home Visits": staff.homeVisits,
      "School Visits": staff.schoolVisits,
      "Program Reports": staff.programReports,
      "Activity Reports": staff.activityReports,
      "Business Visits": staff.businessVisits,
      "Total Reports": staff.total,
      "Active Days": staff.activeDaysCount,
      "Consistency Score": `${staff.consistency}%`
    }));

    downloadExcel(exportData, 'staff_performance_report', 'Staff Performance');
    toast.success("Staff performance report exported");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const totalStaff = staffMetrics.length;
  const totalReports = staffMetrics.reduce((sum, s) => sum + s.total, 0);
  const avgPerStaff = totalStaff > 0 ? Math.round(totalReports / totalStaff) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} border-l-4 border-l-blue-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Active Staff</p>
                <p className="text-2xl font-bold mt-1">{totalStaff}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(1 as CardVariant)} border-l-4 border-l-emerald-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold mt-1">{totalReports}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(2 as CardVariant)} border-l-4 border-l-amber-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avg per Staff</p>
                <p className="text-2xl font-bold mt-1">{avgPerStaff}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <BarChart3 className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(3 as CardVariant)} border-l-4 border-l-purple-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold mt-1 truncate">{topPerformers[0]?.name || 'N/A'}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Award className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Staff Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Heatmap */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Weekly Activity
            </CardTitle>
            <CardDescription>Report submissions over the last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={weeklyActivity}>
                <defs>
                  <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="reports" 
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#activityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Staff Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Staff Leaderboard
            </CardTitle>
            <CardDescription>Top performing staff members</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead className="text-right">Reports</TableHead>
                    <TableHead>Consistency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMetrics.map((staff, index) => (
                    <TableRow key={staff.name}>
                      <TableCell>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell className="text-right font-bold">{staff.total}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={staff.consistency} className="h-2 w-16" />
                          <span className="text-xs text-muted-foreground">{staff.consistency}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Monthly Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Monthly Engagement
            </CardTitle>
            <CardDescription>Active staff and report counts per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyEngagement}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="activeStaff" name="Active Staff" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="totalReports" name="Total Reports" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Staff Performance Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Detailed Performance Breakdown
            </CardTitle>
            <CardDescription>Report submissions by type per staff member</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead className="text-center">Home Visits</TableHead>
                    <TableHead className="text-center">School Visits</TableHead>
                    <TableHead className="text-center">Program Reports</TableHead>
                    <TableHead className="text-center">Activity Reports</TableHead>
                    <TableHead className="text-center">Business Visits</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMetrics.map((staff) => (
                    <TableRow key={staff.name}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell className="text-center">{staff.homeVisits}</TableCell>
                      <TableCell className="text-center">{staff.schoolVisits}</TableCell>
                      <TableCell className="text-center">{staff.programReports}</TableCell>
                      <TableCell className="text-center">{staff.activityReports}</TableCell>
                      <TableCell className="text-center">{staff.businessVisits}</TableCell>
                      <TableCell className="text-center font-bold">{staff.total}</TableCell>
                      <TableCell>
                        {staff.total >= 20 ? (
                          <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Excellent</Badge>
                        ) : staff.total >= 10 ? (
                          <Badge variant="secondary">Good</Badge>
                        ) : staff.total >= 5 ? (
                          <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" /> Moderate</Badge>
                        ) : (
                          <Badge variant="destructive">Needs Improvement</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
