import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Database,
  TrendingUp,
  Clock,
  FileText,
  Users,
  Layers,
  BarChart3,
  Zap
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Area, AreaChart } from "recharts";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { format, startOfMonth, subMonths, eachMonthOfInterval, isWithinInterval, getHours, getDay } from "date-fns";

interface SystemIntelligenceSectionProps {
  beneficiaries: any[];
  enrollments: any[];
  programs: any[];
  reportsData: any;
  uploads: any[];
  // Keep backward compat
  children?: any[];
  programData?: any;
  documents?: any[];
  isLoading: boolean;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];

export function SystemIntelligenceSection({ 
  beneficiaries, enrollments, programs, reportsData, uploads, children, programData, documents, isLoading 
}: SystemIntelligenceSectionProps) {
  const people = beneficiaries || children || [];
  const docs = uploads || documents || [];

  // Data completeness score
  const dataCompleteness = useMemo(() => {
    if (!people.length) return { score: 0, breakdown: [] };
    const fields = [
      { name: 'Gender', field: 'gender' },
      { name: 'Date of Birth', field: 'date_of_birth' },
      { name: 'Academic Level', field: 'academic_level' },
      { name: 'Institution', field: 'institution_name' },
      { name: 'Location', field: 'location' },
      { name: 'County', field: 'county' },
      { name: 'Photo', field: 'photo_url' },
      { name: 'Special Needs', field: 'has_special_needs' }
    ];
    const breakdown = fields.map(f => {
      const filled = people.filter(p => p[f.field] != null && p[f.field] !== '').length;
      return { name: f.name, percentage: Math.round((filled / people.length) * 100), filled, total: people.length };
    });
    const avgScore = Math.round(breakdown.reduce((sum, b) => sum + b.percentage, 0) / breakdown.length);
    return { score: avgScore, breakdown };
  }, [people]);

  // Enrollment coverage (how many beneficiaries are enrolled in at least 1 program)
  const enrollmentCoverage = useMemo(() => {
    const enrolledIds = new Set(enrollments.filter(e => e.status === 'active' || e.status === 'Active').map(e => e.beneficiary_id));
    const activeCount = people.filter(p => p.status === 'active').length;
    return activeCount > 0 ? Math.round((enrolledIds.size / activeCount) * 100) : 0;
  }, [people, enrollments]);

  // Activity by module
  const moduleActivity = useMemo(() => {
    if (!reportsData) return [];
    return [
      { module: 'Home Visits', count: reportsData.homeVisits?.length || 0 },
      { module: 'School Visits', count: reportsData.schoolVisits?.length || 0 },
      { module: 'Program Reports', count: reportsData.programReports?.length || 0 },
      { module: 'Activity Reports', count: reportsData.activityReports?.length || 0 },
      { module: 'Uploads', count: docs.length }
    ].sort((a, b) => b.count - a.count);
  }, [reportsData, docs]);

  // Peak usage
  const usageByHour = useMemo(() => {
    if (!reportsData) return [];
    const hourCounts: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;
    const all = [...(reportsData.homeVisits || []), ...(reportsData.schoolVisits || []), ...(reportsData.programReports || []), ...(reportsData.activityReports || [])];
    all.forEach(r => { const h = getHours(new Date(r.created_at)); hourCounts[h]++; });
    return Object.entries(hourCounts).map(([hour, count]) => ({ hour: `${hour}:00`, count })).filter(h => parseInt(h.hour) >= 6 && parseInt(h.hour) <= 22);
  }, [reportsData]);

  // Usage by day
  const usageByDay = useMemo(() => {
    if (!reportsData) return [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts: Record<number, number> = {};
    for (let i = 0; i < 7; i++) dayCounts[i] = 0;
    const all = [...(reportsData.homeVisits || []), ...(reportsData.schoolVisits || []), ...(reportsData.programReports || []), ...(reportsData.activityReports || [])];
    all.forEach(r => { dayCounts[getDay(new Date(r.created_at))]++; });
    return Object.entries(dayCounts).map(([day, count]) => ({ day: days[parseInt(day)], count }));
  }, [reportsData]);

  // Monthly trends
  const monthlyActivity = useMemo(() => {
    if (!reportsData) return [];
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    return months.map(month => {
      const ms = startOfMonth(month);
      const me = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const countIn = (records: any[]) => records?.filter(r => isWithinInterval(new Date(r.created_at), { start: ms, end: me })).length || 0;
      return {
        month: format(month, 'MMM'),
        reports: countIn(reportsData.homeVisits) + countIn(reportsData.schoolVisits) + countIn(reportsData.programReports) + countIn(reportsData.activityReports),
        uploads: countIn(docs)
      };
    });
  }, [reportsData, docs]);

  const totalReports = moduleActivity.reduce((sum, m) => sum + m.count, 0);

  if (isLoading) {
    return (<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} border-l-4 border-l-blue-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Data Completeness</p>
              <Database className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{dataCompleteness.score}%</p>
            <Progress value={dataCompleteness.score} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card className={`${getCardStyles(1 as CardVariant)} border-l-4 border-l-emerald-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Enrollment Coverage</p>
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold">{enrollmentCoverage}%</p>
            <Progress value={enrollmentCoverage} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card className={`${getCardStyles(2 as CardVariant)} border-l-4 border-l-amber-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Active Programs</p>
              <Layers className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold">{programs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">configured programs</p>
          </CardContent>
        </Card>
        <Card className={`${getCardStyles(3 as CardVariant)} border-l-4 border-l-purple-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Activity</p>
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{totalReports}</p>
            <Badge variant={totalReports > 100 ? 'default' : totalReports > 50 ? 'secondary' : 'destructive'} className="mt-2">
              {totalReports > 100 ? 'High' : totalReports > 50 ? 'Medium' : 'Low'} Activity
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Completeness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" />Data Completeness by Field</CardTitle>
            <CardDescription>How complete is the data for each field across all beneficiaries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dataCompleteness.breakdown.map(field => (
                <div key={field.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{field.name}</span>
                    <span className="text-sm text-muted-foreground">{field.filled}/{field.total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={field.percentage} className="h-2 flex-1" />
                    <Badge variant={field.percentage >= 80 ? 'default' : field.percentage >= 50 ? 'secondary' : 'destructive'} className="w-14 justify-center">{field.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Module Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Activity by Module</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={moduleActivity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="module" type="category" width={100} className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {moduleActivity.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />Peak Usage Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={usageByHour}>
                <defs>
                  <linearGradient id="usageGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#usageGrad2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usage by Day */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Activity by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={usageByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {usageByDay.map((entry, i) => <Cell key={i} fill={entry.day === 'Sat' || entry.day === 'Sun' ? '#e5e7eb' : '#8b5cf6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Monthly System Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyActivity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="reports" name="Reports" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="uploads" name="Uploads" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
