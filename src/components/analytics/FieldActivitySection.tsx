import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Home, 
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  School,
  Building2,
  UsersRound
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Pie, PieChart } from "recharts";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { format, differenceInDays, isWithinInterval, startOfMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { DateRange } from "react-day-picker";

interface FieldActivitySectionProps {
  visitations: any[];
  beneficiaries: any[];
  dateRange: DateRange | undefined;
  isLoading: boolean;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];

const VISIT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Home; color: string }> = {
  home: { label: 'Home Visits', icon: Home, color: '#3b82f6' },
  school: { label: 'School Visits', icon: School, color: '#10b981' },
  hospital: { label: 'Hospital Visits', icon: Building2, color: '#f59e0b' },
  group: { label: 'Group Visits', icon: UsersRound, color: '#8b5cf6' },
};

export function FieldActivitySection({ visitations, beneficiaries, dateRange, isLoading }: FieldActivitySectionProps) {
  // Filter visits by date range
  const filteredVisits = useMemo(() => {
    if (!dateRange?.from) return visitations;
    return visitations.filter(v => {
      const date = new Date(v.visit_date || v.created_at);
      return isWithinInterval(date, { 
        start: dateRange.from!, 
        end: dateRange.to || dateRange.from! 
      });
    });
  }, [visitations, dateRange]);

  // Visits by type
  const visitsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredVisits.forEach(v => {
      const type = v.visit_type || 'home';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      type,
      label: VISIT_TYPE_CONFIG[type]?.label || type,
      count,
      color: VISIT_TYPE_CONFIG[type]?.color || '#6b7280',
    })).sort((a, b) => b.count - a.count);
  }, [filteredVisits]);

  const totalVisits = filteredVisits.length;

  // Visits per staff
  const visitsPerStaff = useMemo(() => {
    const staffCounts: Record<string, number> = {};
    filteredVisits.forEach(v => {
      const staff = v.staff_name || 'Unknown';
      staffCounts[staff] = (staffCounts[staff] || 0) + 1;
    });
    return Object.entries(staffCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredVisits]);

  // Monthly visit trends
  const monthlyTrends = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const monthVisits = visitations.filter(v => {
        const date = new Date(v.visit_date || v.created_at);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const result: any = { month: format(month, 'MMM yyyy'), total: monthVisits.length };
      // Break down by type
      Object.keys(VISIT_TYPE_CONFIG).forEach(type => {
        result[VISIT_TYPE_CONFIG[type].label] = monthVisits.filter(v => v.visit_type === type).length;
      });
      return result;
    });
  }, [visitations]);

  // Beneficiaries overdue for visits (no visit in last 90 days)
  const overdueBeneficiaries = useMemo(() => {
    const now = new Date();
    const activeBeneficiaries = beneficiaries.filter(b => b.status === 'active');
    
    const lastVisitPerBeneficiary: Record<string, Date> = {};
    visitations.forEach(v => {
      if (v.beneficiary_id) {
        const visitDate = new Date(v.visit_date || v.created_at);
        if (!lastVisitPerBeneficiary[v.beneficiary_id] || visitDate > lastVisitPerBeneficiary[v.beneficiary_id]) {
          lastVisitPerBeneficiary[v.beneficiary_id] = visitDate;
        }
      }
    });

    return activeBeneficiaries
      .map(b => {
        const lastVisit = lastVisitPerBeneficiary[b.id];
        const daysSinceVisit = lastVisit ? differenceInDays(now, lastVisit) : 999;
        return { ...b, lastVisit, daysSinceVisit, isOverdue: daysSinceVisit > 90 };
      })
      .filter(b => b.isOverdue)
      .sort((a, b) => b.daysSinceVisit - a.daysSinceVisit)
      .slice(0, 15);
  }, [visitations, beneficiaries]);

  // Visit coverage rate
  const visitCoverageRate = useMemo(() => {
    const activeCount = beneficiaries.filter(b => b.status === 'active').length;
    const visitedInPeriod = new Set(filteredVisits.map(v => v.beneficiary_id)).size;
    return activeCount > 0 ? Math.round((visitedInPeriod / activeCount) * 100) : 0;
  }, [beneficiaries, filteredVisits]);

  // Follow-ups pending
  const pendingFollowUps = useMemo(() => {
    return visitations.filter(v => v.follow_up_required && (!v.follow_up_date || new Date(v.follow_up_date) <= new Date())).length;
  }, [visitations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} border-l-4 border-l-blue-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Visits</p>
                <p className="text-2xl font-bold mt-1">{totalVisits}</p>
              </div>
              <div className="p-2 rounded-lg bg-info/10">
                <Home className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(1 as CardVariant)} border-l-4 border-l-emerald-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Coverage Rate</p>
                <p className="text-2xl font-bold mt-1">{visitCoverageRate}%</p>
              </div>
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
            </div>
            <Progress value={visitCoverageRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(2 as CardVariant)} border-l-4 border-l-amber-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pending Follow-ups</p>
                <p className="text-2xl font-bold mt-1">{pendingFollowUps}</p>
              </div>
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(3 as CardVariant)} border-l-4 border-l-red-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Overdue (90+ days)</p>
                <p className="text-2xl font-bold mt-1">{overdueBeneficiaries.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visit Type Breakdown */}
      {visitsByType.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
          {visitsByType.map(vt => {
            const config = VISIT_TYPE_CONFIG[vt.type];
            const Icon = config?.icon || Home;
            return (
              <Card key={vt.type} className="border-l-4" style={{ borderLeftColor: vt.color }}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: vt.color }} />
                    <span className="text-xs text-muted-foreground">{vt.label}</span>
                  </div>
                  <p className="text-xl font-bold mt-1">{vt.count}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visit Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Visitation Trends
            </CardTitle>
            <CardDescription>All visitations conducted over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {monthlyTrends.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Visits per Staff */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Visits by Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visitsPerStaff.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={visitsPerStaff.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {visitsPerStaff.slice(0, 8).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No visitation data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visit Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Visit Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visitsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={visitsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="label"
                    label={({ label, count }) => `${label}: ${count}`}
                  >
                    {visitsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No visitation data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Beneficiaries */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Beneficiaries Overdue for Visits
            </CardTitle>
            <CardDescription>Active beneficiaries not visited in over 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueBeneficiaries.length > 0 ? (
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead>Days Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueBeneficiaries.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.display_name}</TableCell>
                        <TableCell><Badge variant="outline">{b.beneficiary_type}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.location || b.county || 'N/A'}</TableCell>
                        <TableCell className="text-sm">
                          {b.lastVisit ? format(b.lastVisit, 'MMM d, yyyy') : (
                            <Badge variant="destructive">Never</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={b.daysSinceVisit > 180 ? "destructive" : "secondary"}>
                            <Clock className="h-3 w-3 mr-1" />
                            {b.daysSinceVisit > 900 ? 'Never visited' : `${b.daysSinceVisit} days`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success" />
                <p className="font-medium">All beneficiaries have been visited recently!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}