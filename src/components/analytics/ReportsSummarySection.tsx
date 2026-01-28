import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Home,
  School,
  Activity
} from "lucide-react";
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { format, isWithinInterval, startOfMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { DateRange } from "react-day-picker";

interface ReportsSummarySectionProps {
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

const CHART_COLORS = {
  homeVisits: '#3b82f6',
  schoolVisits: '#10b981',
  programReports: '#8b5cf6',
  activityReports: '#f59e0b',
  businessVisits: '#ec4899'
};

export function ReportsSummarySection({ reportsData, dateRange, isLoading }: ReportsSummarySectionProps) {
  // Filter reports by date range
  const filteredReports = useMemo(() => {
    if (!reportsData) return null;
    
    const filterByDate = (reports: any[]) => {
      if (!dateRange?.from) return reports;
      return reports.filter(r => {
        const date = new Date(r.created_at);
        return isWithinInterval(date, { 
          start: dateRange.from!, 
          end: dateRange.to || dateRange.from! 
        });
      });
    };

    return {
      homeVisits: filterByDate(reportsData.homeVisits),
      schoolVisits: filterByDate(reportsData.schoolVisits),
      programReports: filterByDate(reportsData.programReports),
      activityReports: filterByDate(reportsData.activityReports),
      businessVisits: filterByDate(reportsData.businessVisits || [])
    };
  }, [reportsData, dateRange]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!filteredReports) return { total: 0, breakdown: [] };
    
    const total = 
      filteredReports.homeVisits.length + 
      filteredReports.schoolVisits.length + 
      filteredReports.programReports.length + 
      filteredReports.activityReports.length +
      filteredReports.businessVisits.length;

    return {
      total,
      breakdown: [
        { name: 'Home Visits', count: filteredReports.homeVisits.length, icon: Home, color: CHART_COLORS.homeVisits },
        { name: 'School Visits', count: filteredReports.schoolVisits.length, icon: School, color: CHART_COLORS.schoolVisits },
        { name: 'Program Reports', count: filteredReports.programReports.length, icon: ClipboardList, color: CHART_COLORS.programReports },
        { name: 'Activity Reports', count: filteredReports.activityReports.length, icon: Activity, color: CHART_COLORS.activityReports },
        { name: 'Business Visits', count: filteredReports.businessVisits.length, icon: FileText, color: CHART_COLORS.businessVisits }
      ]
    };
  }, [filteredReports]);

  // Calculate monthly trends
  const monthlyTrends = useMemo(() => {
    if (!filteredReports) return [];
    
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

      return {
        month: format(month, 'MMM yyyy'),
        homeVisits: countInMonth(reportsData?.homeVisits || []),
        schoolVisits: countInMonth(reportsData?.schoolVisits || []),
        programReports: countInMonth(reportsData?.programReports || []),
        activityReports: countInMonth(reportsData?.activityReports || []),
        total: countInMonth(reportsData?.homeVisits || []) + 
               countInMonth(reportsData?.schoolVisits || []) +
               countInMonth(reportsData?.programReports || []) +
               countInMonth(reportsData?.activityReports || [])
      };
    });
  }, [reportsData, filteredReports]);

  // Staff submission summary
  const staffSummary = useMemo(() => {
    if (!filteredReports) return [];
    
    const staffCounts: Record<string, { name: string; total: number; breakdown: Record<string, number> }> = {};
    
    const countForStaff = (reports: any[], type: string) => {
      reports.forEach(r => {
        const staffName = r.staff || 'Unknown';
        if (!staffCounts[staffName]) {
          staffCounts[staffName] = { name: staffName, total: 0, breakdown: {} };
        }
        staffCounts[staffName].total++;
        staffCounts[staffName].breakdown[type] = (staffCounts[staffName].breakdown[type] || 0) + 1;
      });
    };

    countForStaff(filteredReports.homeVisits, 'Home Visits');
    countForStaff(filteredReports.schoolVisits, 'School Visits');
    countForStaff(filteredReports.programReports, 'Program Reports');
    countForStaff(filteredReports.activityReports, 'Activity Reports');
    countForStaff(filteredReports.businessVisits, 'Business Visits');

    return Object.values(staffCounts).sort((a, b) => b.total - a.total);
  }, [filteredReports]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {totals.breakdown.map((item, index) => {
          const cardStyle = getCardStyles((index % 6) as CardVariant);
          return (
            <Card key={item.name} className={`${cardStyle} border-l-4`} style={{ borderLeftColor: item.color }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{item.name}</p>
                    <p className="text-2xl font-bold mt-1">{item.count}</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${item.color}20` }}>
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Trends Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Report Submission Trends
            </CardTitle>
            <CardDescription>Monthly report submissions over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="homeVisits" name="Home Visits" stroke={CHART_COLORS.homeVisits} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="schoolVisits" name="School Visits" stroke={CHART_COLORS.schoolVisits} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="programReports" name="Program Reports" stroke={CHART_COLORS.programReports} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="activityReports" name="Activity Reports" stroke={CHART_COLORS.activityReports} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Staff Submission Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Staff Submission Summary
            </CardTitle>
            <CardDescription>Reports submitted by each staff member in the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {staffSummary.length > 0 ? (
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead className="text-center">Total Reports</TableHead>
                      <TableHead className="text-center">Home Visits</TableHead>
                      <TableHead className="text-center">School Visits</TableHead>
                      <TableHead className="text-center">Program</TableHead>
                      <TableHead className="text-center">Activity</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffSummary.map((staff, index) => (
                      <TableRow key={staff.name}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {index === 0 && <Badge className="bg-amber-500">Top</Badge>}
                            {staff.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">{staff.total}</TableCell>
                        <TableCell className="text-center">{staff.breakdown['Home Visits'] || 0}</TableCell>
                        <TableCell className="text-center">{staff.breakdown['School Visits'] || 0}</TableCell>
                        <TableCell className="text-center">{staff.breakdown['Program Reports'] || 0}</TableCell>
                        <TableCell className="text-center">{staff.breakdown['Activity Reports'] || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={Math.min((staff.total / (staffSummary[0]?.total || 1)) * 100, 100)} 
                              className="h-2 w-20" 
                            />
                            {staff.total >= 10 ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : staff.total >= 5 ? (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reports submitted in the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
