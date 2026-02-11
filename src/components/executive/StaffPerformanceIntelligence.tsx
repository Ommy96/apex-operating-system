import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Award, TrendingUp, Calendar, CheckCircle2, AlertTriangle,
  Download, Activity, BarChart3, ShieldAlert, Gauge, UserCheck, UserX
} from "lucide-react";
import {
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Area, AreaChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, PieChart, Pie
} from "recharts";
import { StaffMetric } from "@/hooks/useExecutiveAnalytics";
import { downloadExcel } from "@/lib/downloadUtils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface StaffPerformanceIntelligenceProps {
  staffMetrics: StaffMetric[];
  monthlyTrends: any[];
  hrAlerts: { type: 'warning' | 'danger' | 'info'; title: string; description: string }[];
  isLoading: boolean;
}

const CHART_COLORS = ['hsl(222, 47%, 31%)', 'hsl(217, 91%, 60%)', 'hsl(142, 72%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(270, 70%, 50%)', 'hsl(350, 80%, 50%)'];

const scoreColor = (score: number) =>
  score >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
  score >= 50 ? 'text-amber-600 dark:text-amber-400' :
  score >= 25 ? 'text-orange-600 dark:text-orange-400' :
  'text-red-600 dark:text-red-400';

const scoreBadge = (score: number) =>
  score >= 75 ? { label: 'Excellent', variant: 'default' as const, className: 'bg-emerald-500 hover:bg-emerald-600' } :
  score >= 50 ? { label: 'Good', variant: 'secondary' as const, className: '' } :
  score >= 25 ? { label: 'Moderate', variant: 'outline' as const, className: '' } :
  { label: 'Needs Improvement', variant: 'destructive' as const, className: '' };

const workloadBadge = (level: string) => {
  switch (level) {
    case 'overloaded': return <Badge variant="destructive" className="text-[10px]"><UserX className="h-3 w-3 mr-1" />Overloaded</Badge>;
    case 'high': return <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px]"><Activity className="h-3 w-3 mr-1" />High</Badge>;
    case 'moderate': return <Badge variant="secondary" className="text-[10px]"><UserCheck className="h-3 w-3 mr-1" />Moderate</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">Low</Badge>;
  }
};

export function StaffPerformanceIntelligence({
  staffMetrics, monthlyTrends, hrAlerts, isLoading
}: StaffPerformanceIntelligenceProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const topPerformers = useMemo(() => staffMetrics.slice(0, 5), [staffMetrics]);

  // Workload distribution chart
  const workloadDistribution = useMemo(() => {
    const counts = { low: 0, moderate: 0, high: 0, overloaded: 0 };
    staffMetrics.forEach(s => counts[s.workloadLevel]++);
    return [
      { name: 'Low', value: counts.low, fill: 'hsl(210, 100%, 50%)' },
      { name: 'Moderate', value: counts.moderate, fill: 'hsl(142, 72%, 42%)' },
      { name: 'High', value: counts.high, fill: 'hsl(38, 92%, 50%)' },
      { name: 'Overloaded', value: counts.overloaded, fill: 'hsl(0, 72%, 51%)' },
    ].filter(d => d.value > 0);
  }, [staffMetrics]);

  // Radar data for top 4
  const radarData = useMemo(() => {
    const top4 = staffMetrics.slice(0, 4);
    if (top4.length === 0) return [];
    const metrics = ['Reports', 'Visits', 'Registrations', 'Observations', 'Follow-ups'];
    return metrics.map((metric, i) => {
      const entry: any = { metric };
      top4.forEach(s => {
        const vals = [s.total, s.homeVisits + s.schoolVisits + s.businessVisits, s.beneficiariesRegistered, s.observationsRecorded, s.followUpsCompleted];
        entry[s.name.split(' ')[0]] = vals[i];
      });
      return entry;
    });
  }, [staffMetrics]);

  // Performance distribution
  const performanceDistribution = useMemo(() => {
    const buckets = [
      { range: '0-25', count: 0 },
      { range: '26-50', count: 0 },
      { range: '51-75', count: 0 },
      { range: '76-100', count: 0 },
    ];
    staffMetrics.forEach(s => {
      if (s.performanceScore <= 25) buckets[0].count++;
      else if (s.performanceScore <= 50) buckets[1].count++;
      else if (s.performanceScore <= 75) buckets[2].count++;
      else buckets[3].count++;
    });
    return buckets;
  }, [staffMetrics]);

  const handleExport = () => {
    if (!staffMetrics.length) return toast.error("No staff data to export");
    const exportData = staffMetrics.map(s => ({
      "Staff Name": s.name,
      "Performance Score": s.performanceScore,
      "Home Visits": s.homeVisits,
      "School Visits": s.schoolVisits,
      "Program Reports": s.programReports,
      "Activity Reports": s.activityReports,
      "Business Visits": s.businessVisits,
      "Beneficiaries Registered": s.beneficiariesRegistered,
      "Observations": s.observationsRecorded,
      "Follow-ups Completed": s.followUpsCompleted,
      "Total Reports": s.total,
      "Active Days": s.activeDaysCount,
      "Consistency": `${s.consistency}%`,
      "Workload Level": s.workloadLevel,
    }));
    downloadExcel(exportData, 'staff_performance_intelligence', 'Staff Performance');
    toast.success("Staff performance report exported");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const totalStaff = staffMetrics.length;
  const totalReports = staffMetrics.reduce((s, m) => s + m.total, 0);
  const avgScore = totalStaff > 0 ? Math.round(staffMetrics.reduce((s, m) => s + m.performanceScore, 0) / totalStaff) : 0;
  const overloaded = staffMetrics.filter(s => s.workloadLevel === 'overloaded').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Active Staff</p>
                <p className="text-2xl font-bold mt-1">{totalStaff}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avg Performance</p>
                <p className={`text-2xl font-bold mt-1 ${scoreColor(avgScore)}`}>{avgScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10"><Gauge className="h-5 w-5 text-emerald-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold mt-1">{totalReports}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10"><BarChart3 className="h-5 w-5 text-amber-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 border-0 shadow-sm ${overloaded > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Overloaded Staff</p>
                <p className={`text-2xl font-bold mt-1 ${overloaded > 0 ? 'text-red-600' : 'text-green-600'}`}>{overloaded}</p>
              </div>
              <div className={`p-2 rounded-lg ${overloaded > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                <ShieldAlert className={`h-5 w-5 ${overloaded > 0 ? 'text-red-500' : 'text-green-500'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />Export Staff Report
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto gap-1 p-1 bg-muted/50 flex-wrap">
          <TabsTrigger value="overview" className="text-xs gap-1.5"><Award className="h-3.5 w-3.5" />Rankings</TabsTrigger>
          <TabsTrigger value="workload" className="text-xs gap-1.5"><Activity className="h-3.5 w-3.5" />Workload</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Trends</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />HR Alerts ({hrAlerts.length})</TabsTrigger>
          <TabsTrigger value="detailed" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Detailed</TabsTrigger>
        </TabsList>

        {/* Rankings Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leaderboard */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4 text-amber-500" />Performance Leaderboard</CardTitle>
                <CardDescription>Staff ranked by composite performance score</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffMetrics.map((s, i) => {
                        const badge = scoreBadge(s.performanceScore);
                        return (
                          <TableRow key={s.name}>
                            <TableCell className="font-medium">
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                            </TableCell>
                            <TableCell className="font-medium text-sm">{s.name}</TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold ${scoreColor(s.performanceScore)}`}>{s.performanceScore}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={badge.variant} className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {staffMetrics.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No staff data available</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Performance Distribution */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" />Score Distribution</CardTitle>
                <CardDescription>How staff scores are distributed</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={performanceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="range" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="count" name="Staff Count" radius={[4, 4, 0, 0]}>
                      {performanceDistribution.map((_, i) => (
                        <Cell key={i} fill={[CHART_COLORS[5], CHART_COLORS[3], CHART_COLORS[2], CHART_COLORS[1]][i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Radar comparison */}
                {radarData.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Top Staff Comparison</p>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={radarData}>
                        <PolarGrid className="stroke-muted" />
                        <PolarAngleAxis dataKey="metric" className="text-xs" />
                        <PolarRadiusAxis className="text-xs" />
                        {staffMetrics.slice(0, 4).map((s, i) => (
                          <Radar key={s.name} name={s.name.split(' ')[0]} dataKey={s.name.split(' ')[0]} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.15} />
                        ))}
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Workload Tab */}
        <TabsContent value="workload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workload Distribution Pie */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Workload Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={workloadDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                      {workloadDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Workload Table */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Staff Workload Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[320px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-center">Reports</TableHead>
                        <TableHead className="text-center">Registered</TableHead>
                        <TableHead>Workload</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffMetrics.map(s => (
                        <TableRow key={s.name}>
                          <TableCell className="font-medium text-sm">{s.name}</TableCell>
                          <TableCell className="text-center">{s.total}</TableCell>
                          <TableCell className="text-center">{s.beneficiariesRegistered}</TableCell>
                          <TableCell>{workloadBadge(s.workloadLevel)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2 border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Monthly Staff Engagement</CardTitle>
                <CardDescription>Active staff and total report submissions per month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrends}>
                    <defs>
                      <linearGradient id="staffGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(222, 47%, 31%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(222, 47%, 31%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="reportsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthShort" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="activeStaff" name="Active Staff" stroke="hsl(222, 47%, 31%)" fill="url(#staffGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="totalReports" name="Reports" stroke="hsl(217, 91%, 60%)" fill="url(#reportsGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Visit Types by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthShort" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="homeVisits" name="Home Visits" fill="hsl(222, 47%, 31%)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="schoolVisits" name="School Visits" fill="hsl(217, 91%, 60%)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Consistency Trend */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Staff Consistency</CardTitle>
                <CardDescription>Reporting consistency scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="text-xs w-6 text-muted-foreground">{i + 1}</span>
                      <span className="text-sm font-medium flex-1 truncate">{s.name}</span>
                      <Progress value={s.consistency} className="h-2 w-24" />
                      <span className="text-xs text-muted-foreground w-10 text-right">{s.consistency}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* HR Alerts Tab */}
        <TabsContent value="alerts">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-500" />HR Alerts & Risk Monitoring</CardTitle>
              <CardDescription>Automated alerts for staff performance issues</CardDescription>
            </CardHeader>
            <CardContent>
              {hrAlerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">All Clear</p>
                  <p className="text-sm">No HR risk alerts detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hrAlerts.map((alert, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        alert.type === 'danger' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' :
                        alert.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' :
                        'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {alert.type === 'danger' ? <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" /> :
                       alert.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" /> :
                       <Activity className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />}
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Breakdown Tab */}
        <TabsContent value="detailed">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Detailed Performance Breakdown</CardTitle>
              <CardDescription>Complete activity breakdown by staff member</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10">Staff</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Home</TableHead>
                        <TableHead className="text-center">School</TableHead>
                        <TableHead className="text-center">Program</TableHead>
                        <TableHead className="text-center">Activity</TableHead>
                        <TableHead className="text-center">Business</TableHead>
                        <TableHead className="text-center">Registered</TableHead>
                        <TableHead className="text-center">Observations</TableHead>
                        <TableHead className="text-center">Follow-ups</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead>Workload</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffMetrics.map(s => (
                        <TableRow key={s.name}>
                          <TableCell className="font-medium sticky left-0 bg-card z-10 text-sm">{s.name}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${scoreColor(s.performanceScore)}`}>{s.performanceScore}</span>
                          </TableCell>
                          <TableCell className="text-center text-sm">{s.homeVisits}</TableCell>
                          <TableCell className="text-center text-sm">{s.schoolVisits}</TableCell>
                          <TableCell className="text-center text-sm">{s.programReports}</TableCell>
                          <TableCell className="text-center text-sm">{s.activityReports}</TableCell>
                          <TableCell className="text-center text-sm">{s.businessVisits}</TableCell>
                          <TableCell className="text-center text-sm">{s.beneficiariesRegistered}</TableCell>
                          <TableCell className="text-center text-sm">{s.observationsRecorded}</TableCell>
                          <TableCell className="text-center text-sm">{s.followUpsCompleted}</TableCell>
                          <TableCell className="text-center font-bold">{s.total}</TableCell>
                          <TableCell>{workloadBadge(s.workloadLevel)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
