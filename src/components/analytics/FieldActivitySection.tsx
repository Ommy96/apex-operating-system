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
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, Pie, PieChart } from "recharts";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { format, differenceInDays, isWithinInterval, startOfMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { DateRange } from "react-day-picker";

interface FieldActivitySectionProps {
  homeVisits: any[];
  children: any[];
  dateRange: DateRange | undefined;
  isLoading: boolean;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];

export function FieldActivitySection({ homeVisits, children, dateRange, isLoading }: FieldActivitySectionProps) {
  // Filter visits by date range
  const filteredVisits = useMemo(() => {
    if (!dateRange?.from) return homeVisits;
    return homeVisits.filter(v => {
      const date = new Date(v.visit_date || v.created_at);
      return isWithinInterval(date, { 
        start: dateRange.from!, 
        end: dateRange.to || dateRange.from! 
      });
    });
  }, [homeVisits, dateRange]);

  // Total visits
  const totalVisits = filteredVisits.length;

  // Visits per staff
  const visitsPerStaff = useMemo(() => {
    const staffCounts: Record<string, number> = {};
    filteredVisits.forEach(v => {
      const staff = v.staff || 'Unknown';
      staffCounts[staff] = (staffCounts[staff] || 0) + 1;
    });
    return Object.entries(staffCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredVisits]);

  // Visits by location
  const visitsByLocation = useMemo(() => {
    const locationCounts: Record<string, number> = {};
    filteredVisits.forEach(v => {
      const location = v.location || 'Unspecified';
      locationCounts[location] = (locationCounts[location] || 0) + 1;
    });
    return Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
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
      
      const count = homeVisits.filter(v => {
        const date = new Date(v.visit_date || v.created_at);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      }).length;

      return {
        month: format(month, 'MMM yyyy'),
        visits: count
      };
    });
  }, [homeVisits]);

  // Children overdue for visits (no visit in last 90 days)
  const overdueChildren = useMemo(() => {
    const now = new Date();
    const visitedChildIds = new Set<string>();
    
    // Get last visit date per child
    const lastVisitPerChild: Record<string, Date> = {};
    homeVisits.forEach(v => {
      if (v.student_id) {
        const visitDate = new Date(v.visit_date || v.created_at);
        if (!lastVisitPerChild[v.student_id] || visitDate > lastVisitPerChild[v.student_id]) {
          lastVisitPerChild[v.student_id] = visitDate;
          visitedChildIds.add(v.student_id);
        }
      }
    });

    // Find children with no recent visit or never visited
    return children
      .map(child => {
        const lastVisit = lastVisitPerChild[child.id];
        const daysSinceVisit = lastVisit ? differenceInDays(now, lastVisit) : 999;
        return {
          ...child,
          lastVisit,
          daysSinceVisit,
          isOverdue: daysSinceVisit > 90
        };
      })
      .filter(c => c.isOverdue && c.status === 'active')
      .sort((a, b) => b.daysSinceVisit - a.daysSinceVisit)
      .slice(0, 15);
  }, [homeVisits, children]);

  // Visit coverage rate
  const visitCoverageRate = useMemo(() => {
    const activeChildren = children.filter(c => c.status === 'active').length;
    const visitedInPeriod = new Set(filteredVisits.map(v => v.student_id)).size;
    return activeChildren > 0 ? Math.round((visitedInPeriod / activeChildren) * 100) : 0;
  }, [children, filteredVisits]);

  // Average visits per child
  const avgVisitsPerChild = useMemo(() => {
    const activeChildren = children.filter(c => c.status === 'active').length;
    return activeChildren > 0 ? (totalVisits / activeChildren).toFixed(1) : '0';
  }, [children, totalVisits]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} border-l-4 border-l-blue-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Visits</p>
                <p className="text-2xl font-bold mt-1">{totalVisits}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Home className="h-5 w-5 text-blue-500" />
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
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <Progress value={visitCoverageRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(2 as CardVariant)} border-l-4 border-l-amber-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avg per Child</p>
                <p className="text-2xl font-bold mt-1">{avgVisitsPerChild}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(3 as CardVariant)} border-l-4 border-l-red-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Overdue (90+ days)</p>
                <p className="text-2xl font-bold mt-1">{overdueChildren.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visit Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Visit Trends
            </CardTitle>
            <CardDescription>Home visits conducted over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="visits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
            <CardDescription>Distribution of visits across staff members</CardDescription>
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
                <p>No visit data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visits by Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Visits by Location
            </CardTitle>
            <CardDescription>Geographic distribution of home visits</CardDescription>
          </CardHeader>
          <CardContent>
            {visitsByLocation.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={visitsByLocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="location"
                    label={({ location, count }) => `${location}: ${count}`}
                  >
                    {visitsByLocation.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No location data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Children Overdue for Visits */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Children Overdue for Home Visits
            </CardTitle>
            <CardDescription>Active children who haven't been visited in over 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueChildren.length > 0 ? (
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead>Days Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueChildren.map((child) => (
                      <TableRow key={child.id}>
                        <TableCell className="font-medium">
                          {child.first_name} {child.last_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {child.institution_name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {child.residence || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {child.lastVisit ? format(child.lastVisit, 'MMM d, yyyy') : (
                            <Badge variant="destructive">Never</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={child.daysSinceVisit > 180 ? "destructive" : "secondary"}
                            className="flex items-center gap-1 w-fit"
                          >
                            <Clock className="h-3 w-3" />
                            {child.daysSinceVisit > 900 ? 'Never visited' : `${child.daysSinceVisit} days`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                <p className="font-medium">All children have been visited recently!</p>
                <p className="text-sm">No active children are overdue for home visits.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
