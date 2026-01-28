import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Database,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Zap,
  BarChart3,
  FileText,
  Users,
  Target,
  Layers
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, Area, AreaChart, Pie, PieChart, RadialBarChart, RadialBar } from "recharts";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { format, startOfMonth, subMonths, eachMonthOfInterval, isWithinInterval, getHours, getDay } from "date-fns";

interface SystemIntelligenceSectionProps {
  children: any[];
  programData: any;
  reportsData: any;
  documents: any[];
  isLoading: boolean;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];

export function SystemIntelligenceSection({ 
  children, 
  programData, 
  reportsData, 
  documents,
  isLoading 
}: SystemIntelligenceSectionProps) {
  // Data completeness score
  const dataCompleteness = useMemo(() => {
    if (!children.length) return { score: 0, breakdown: [] };
    
    const fields = [
      { name: 'Gender', field: 'gender' },
      { name: 'Date of Birth', field: 'date_of_birth' },
      { name: 'Academic Level', field: 'academic_level' },
      { name: 'Institution', field: 'institution_name' },
      { name: 'Guardian Name', field: 'guardian_name' },
      { name: 'Guardian Phone', field: 'guardian_phone' },
      { name: 'Address', field: 'address' },
      { name: 'Photo', field: 'photo_url' }
    ];

    const breakdown = fields.map(f => {
      const filled = children.filter(c => c[f.field] && c[f.field] !== '').length;
      return {
        name: f.name,
        percentage: Math.round((filled / children.length) * 100),
        filled,
        total: children.length
      };
    });

    const avgScore = Math.round(breakdown.reduce((sum, b) => sum + b.percentage, 0) / breakdown.length);

    return { score: avgScore, breakdown };
  }, [children]);

  // Activity by module
  const moduleActivity = useMemo(() => {
    if (!reportsData) return [];
    
    return [
      { module: 'Home Visits', count: reportsData.homeVisits?.length || 0 },
      { module: 'School Visits', count: reportsData.schoolVisits?.length || 0 },
      { module: 'Program Reports', count: reportsData.programReports?.length || 0 },
      { module: 'Activity Reports', count: reportsData.activityReports?.length || 0 },
      { module: 'Documents', count: documents?.length || 0 }
    ].sort((a, b) => b.count - a.count);
  }, [reportsData, documents]);

  // Peak usage times (by hour)
  const usageByHour = useMemo(() => {
    if (!reportsData) return [];
    
    const hourCounts: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;

    const allReports = [
      ...(reportsData.homeVisits || []),
      ...(reportsData.schoolVisits || []),
      ...(reportsData.programReports || []),
      ...(reportsData.activityReports || [])
    ];

    allReports.forEach(r => {
      const hour = getHours(new Date(r.created_at));
      hourCounts[hour]++;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: `${hour}:00`,
        count
      }))
      .filter(h => {
        const hourNum = parseInt(h.hour);
        return hourNum >= 6 && hourNum <= 22;
      });
  }, [reportsData]);

  // Usage by day of week
  const usageByDay = useMemo(() => {
    if (!reportsData) return [];
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts: Record<number, number> = {};
    for (let i = 0; i < 7; i++) dayCounts[i] = 0;

    const allReports = [
      ...(reportsData.homeVisits || []),
      ...(reportsData.schoolVisits || []),
      ...(reportsData.programReports || []),
      ...(reportsData.activityReports || [])
    ];

    allReports.forEach(r => {
      const day = getDay(new Date(r.created_at));
      dayCounts[day]++;
    });

    return Object.entries(dayCounts).map(([day, count]) => ({
      day: days[parseInt(day)],
      count
    }));
  }, [reportsData]);

  // Monthly activity trends
  const monthlyActivity = useMemo(() => {
    if (!reportsData) return [];
    
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const countInMonth = (records: any[]) => 
        records?.filter(r => {
          const date = new Date(r.created_at);
          return isWithinInterval(date, { start: monthStart, end: monthEnd });
        }).length || 0;

      return {
        month: format(month, 'MMM'),
        reports: countInMonth(reportsData.homeVisits) +
                 countInMonth(reportsData.schoolVisits) +
                 countInMonth(reportsData.programReports) +
                 countInMonth(reportsData.activityReports),
        documents: countInMonth(documents)
      };
    });
  }, [reportsData, documents]);

  // System health metrics
  const systemHealth = useMemo(() => {
    const totalReports = moduleActivity.reduce((sum, m) => sum + m.count, 0);
    const activePrograms = programData ? Object.values(programData).filter((p: any) => p?.length > 0).length : 0;
    
    return {
      dataCompleteness: dataCompleteness.score,
      reportActivity: totalReports > 100 ? 'High' : totalReports > 50 ? 'Medium' : 'Low',
      programCoverage: activePrograms,
      documentCompliance: documents.length > 0 ? Math.min(100, Math.round((documents.length / (children.length * 4)) * 100)) : 0
    };
  }, [dataCompleteness, moduleActivity, programData, documents, children]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} border-l-4 border-l-blue-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Data Completeness</p>
              <Database className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{systemHealth.dataCompleteness}%</p>
            <Progress value={systemHealth.dataCompleteness} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(1 as CardVariant)} border-l-4 border-l-emerald-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Report Activity</p>
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold">{moduleActivity.reduce((sum, m) => sum + m.count, 0)}</p>
            <Badge 
              variant={systemHealth.reportActivity === 'High' ? 'default' : systemHealth.reportActivity === 'Medium' ? 'secondary' : 'destructive'}
              className="mt-2"
            >
              {systemHealth.reportActivity} Activity
            </Badge>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(2 as CardVariant)} border-l-4 border-l-amber-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Active Programs</p>
              <Layers className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold">{systemHealth.programCoverage}</p>
            <p className="text-xs text-muted-foreground mt-1">of 7 programs</p>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(3 as CardVariant)} border-l-4 border-l-purple-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Doc Compliance</p>
              <FileText className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{systemHealth.documentCompliance}%</p>
            <Progress value={systemHealth.documentCompliance} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Completeness Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Data Completeness by Field
            </CardTitle>
            <CardDescription>How complete is the data for each field across all children</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dataCompleteness.breakdown.map((field, index) => (
                <div key={field.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{field.name}</span>
                    <span className="text-sm text-muted-foreground">{field.filled}/{field.total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={field.percentage} 
                      className="h-2 flex-1"
                    />
                    <Badge 
                      variant={field.percentage >= 80 ? 'default' : field.percentage >= 50 ? 'secondary' : 'destructive'}
                      className="w-14 justify-center"
                    >
                      {field.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Module Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Activity by Module
            </CardTitle>
            <CardDescription>Record counts across different system modules</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={moduleActivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="module" type="category" width={100} className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {moduleActivity.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak Usage Times */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Peak Usage Hours
            </CardTitle>
            <CardDescription>When users are most active in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={usageByHour}>
                <defs>
                  <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#usageGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usage by Day */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Activity by Day of Week
            </CardTitle>
            <CardDescription>Which days see the most system activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={usageByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {usageByDay.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.day === 'Sat' || entry.day === 'Sun' ? '#e5e7eb' : '#8b5cf6'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Activity Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Monthly System Activity
            </CardTitle>
            <CardDescription>Reports and document uploads over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyActivity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="reports" name="Reports" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="documents" name="Documents" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
