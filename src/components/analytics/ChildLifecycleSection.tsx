import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Eye,
  Search,
  Download
} from "lucide-react";
import { Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, BarChart, Bar } from "recharts";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { format, isWithinInterval, startOfMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { DateRange } from "react-day-picker";
import * as XLSX from 'xlsx';

interface ChildLifecycleSectionProps {
  children: any[];
  replacements: any[];
  dateRange: DateRange | undefined;
  isLoading: boolean;
}

const CHART_COLORS = {
  active: '#10b981',
  inactive: '#ef4444',
  replaced: '#f59e0b',
  new: '#3b82f6'
};

export function ChildLifecycleSection({ children, replacements, dateRange, isLoading }: ChildLifecycleSectionProps) {
  const [showAllReplacements, setShowAllReplacements] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Status distribution
  const statusDistribution = useMemo(() => {
    if (!children.length) return { active: 0, inactive: 0, total: 0 };
    
    const active = children.filter(c => c.status === 'active').length;
    return { 
      active, 
      inactive: children.length - active,
      total: children.length
    };
  }, [children]);

  // Retention rate
  const retentionRate = useMemo(() => {
    if (!children.length) return 0;
    return Math.round((statusDistribution.active / children.length) * 100);
  }, [children, statusDistribution]);

  // Inactive reasons breakdown
  const inactiveReasons = useMemo(() => {
    if (!children.length) return [];
    
    const reasons: Record<string, number> = {};
    children
      .filter(c => c.status !== 'active' && c.inactive_reason)
      .forEach(child => {
        const reason = child.inactive_reason || 'Unspecified';
        reasons[reason] = (reasons[reason] || 0) + 1;
      });

    return Object.entries(reasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }, [children]);

  // Monthly enrollment/exit trends
  const monthlyTrends = useMemo(() => {
    if (!children.length) return [];
    
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const newEnrollments = children.filter(c => {
        const created = new Date(c.created_at);
        return isWithinInterval(created, { start: monthStart, end: monthEnd });
      }).length;

      const exits = children.filter(c => {
        if (!c.inactive_date) return false;
        const inactiveDate = new Date(c.inactive_date);
        return isWithinInterval(inactiveDate, { start: monthStart, end: monthEnd });
      }).length;

      return {
        month: format(month, 'MMM yyyy'),
        enrollments: newEnrollments,
        exits,
        net: newEnrollments - exits
      };
    });
  }, [children]);

  // Replacements in period (limited to 20 for preview)
  const replacementsInPeriod = useMemo(() => {
    if (!replacements.length) return [];
    
    return replacements
      .filter(r => {
        if (!dateRange?.from) return true;
        const date = new Date(r.created_at);
        return isWithinInterval(date, { 
          start: dateRange.from, 
          end: dateRange.to || dateRange.from 
        });
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);
  }, [replacements, dateRange]);

  // All replacements (for dialog view)
  const allReplacements = useMemo(() => {
    if (!replacements.length) return [];
    
    return replacements
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [replacements]);

  // Filtered replacements for search
  const filteredReplacements = useMemo(() => {
    if (!searchQuery.trim()) return allReplacements;
    
    const query = searchQuery.toLowerCase();
    return allReplacements.filter(r => 
      (r.original_name && r.original_name.toLowerCase().includes(query)) ||
      (r.new_child_full_name && r.new_child_full_name.toLowerCase().includes(query)) ||
      (r.reason && r.reason.toLowerCase().includes(query))
    );
  }, [allReplacements, searchQuery]);

  // Export replacements to Excel
  const handleExportReplacements = () => {
    const exportData = filteredReplacements.map(r => ({
      'Original Student': r.original_name || 'N/A',
      'Replacement Student': r.new_child_full_name || 'Pending',
      'Gender': r.new_child_gender || 'N/A',
      'Grade': r.new_child_grade || 'N/A',
      'Academic Level': r.new_child_academic_level || 'N/A',
      'School': r.new_child_school || 'N/A',
      'Location': r.new_child_location || 'N/A',
      'Reason': r.reason || 'N/A',
      'Notes': r.notes || '',
      'Replacement Date': r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Replaced Students');
    XLSX.writeFile(workbook, `replaced_students_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

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
                <p className="text-xs font-medium text-muted-foreground">Total Children</p>
                <p className="text-2xl font-bold mt-1">{statusDistribution.total}</p>
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
                <p className="text-xs font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold mt-1">{statusDistribution.active}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(2 as CardVariant)} border-l-4 border-l-red-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold mt-1">{statusDistribution.inactive}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(3 as CardVariant)} border-l-4 border-l-amber-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Retention Rate</p>
                <p className="text-2xl font-bold mt-1">{retentionRate}%</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Activity className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <Progress value={retentionRate} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment/Exit Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Enrollment & Exit Trends
            </CardTitle>
            <CardDescription>Monthly new enrollments vs exits over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="enrollmentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.new} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.new} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="exitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.inactive} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.inactive} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="enrollments" 
                  name="New Enrollments"
                  stroke={CHART_COLORS.new}
                  fillOpacity={1}
                  fill="url(#enrollmentGrad)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="exits" 
                  name="Exits"
                  stroke={CHART_COLORS.inactive}
                  fillOpacity={1}
                  fill="url(#exitGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Status Distribution
            </CardTitle>
            <CardDescription>Active vs inactive children</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: statusDistribution.active, color: CHART_COLORS.active },
                    { name: 'Inactive', value: statusDistribution.inactive, color: CHART_COLORS.inactive }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill={CHART_COLORS.active} />
                  <Cell fill={CHART_COLORS.inactive} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inactive Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reasons for Inactivity
            </CardTitle>
            <CardDescription>Breakdown of why children became inactive</CardDescription>
          </CardHeader>
          <CardContent>
            {inactiveReasons.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={inactiveReasons} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="reason" type="category" width={120} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS.inactive} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                <p>No inactive children recorded</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Replacements */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Recent Replacements
              </CardTitle>
              <CardDescription>Children who have been replaced in the program</CardDescription>
            </div>
            {allReplacements.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAllReplacements(true)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                View All ({allReplacements.length})
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {replacementsInPeriod.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original Child</TableHead>
                      <TableHead>Replacement</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {replacementsInPeriod.map((replacement, index) => (
                      <TableRow key={replacement.id || index}>
                        <TableCell className="font-medium">{replacement.original_name || 'N/A'}</TableCell>
                        <TableCell>{replacement.new_child_full_name || 'Pending'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{replacement.reason || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(replacement.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No replacements in the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View All Replacements Dialog */}
      <Dialog open={showAllReplacements} onOpenChange={setShowAllReplacements}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              All Replaced Students
            </DialogTitle>
            <DialogDescription>
              Complete list of all students who have been replaced ({allReplacements.length} total)
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportReplacements}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </div>

          <ScrollArea className="h-[500px] rounded-md border">
            {filteredReplacements.length > 0 ? (
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Original Student</TableHead>
                    <TableHead>Replacement Student</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReplacements.map((replacement, index) => (
                    <TableRow key={replacement.id || index}>
                      <TableCell className="font-medium">{replacement.original_name || 'N/A'}</TableCell>
                      <TableCell>{replacement.new_child_full_name || 'Pending'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{replacement.new_child_gender || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{replacement.new_child_grade || 'N/A'}</TableCell>
                      <TableCell>{replacement.new_child_location || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{replacement.reason || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(replacement.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No replacements found matching your search</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
