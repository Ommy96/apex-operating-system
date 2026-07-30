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
  children: any[]; // actually beneficiaries
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

export function ChildLifecycleSection({ children: beneficiaries, replacements, dateRange, isLoading }: ChildLifecycleSectionProps) {
  const [showAllReplacements, setShowAllReplacements] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Status distribution
  const statusDistribution = useMemo(() => {
    if (!beneficiaries.length) return { active: 0, inactive: 0, total: 0 };
    const active = beneficiaries.filter(b => b.status === 'active').length;
    return { active, inactive: beneficiaries.length - active, total: beneficiaries.length };
  }, [beneficiaries]);

  // By beneficiary type
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    beneficiaries.forEach(b => {
      const type = b.beneficiary_type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [beneficiaries]);

  // Gender distribution
  const genderDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    beneficiaries.forEach(b => {
      const gender = b.gender || 'Not specified';
      counts[gender] = (counts[gender] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [beneficiaries]);

  const retentionRate = useMemo(() => {
    if (!beneficiaries.length) return 0;
    return Math.round((statusDistribution.active / beneficiaries.length) * 100);
  }, [beneficiaries, statusDistribution]);

  // Monthly enrollment trends
  const monthlyTrends = useMemo(() => {
    if (!beneficiaries.length) return [];
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const newRegistrations = beneficiaries.filter(b => {
        const created = new Date(b.created_at);
        return isWithinInterval(created, { start: monthStart, end: monthEnd });
      }).length;
      const exits = beneficiaries.filter(b => {
        if (!b.inactive_date) return false;
        const inactiveDate = new Date(b.inactive_date);
        return isWithinInterval(inactiveDate, { start: monthStart, end: monthEnd });
      }).length;
      return { month: format(month, 'MMM yyyy'), registrations: newRegistrations, exits, net: newRegistrations - exits };
    });
  }, [beneficiaries]);

  // Inactive reasons
  const inactiveReasons = useMemo(() => {
    const reasons: Record<string, number> = {};
    beneficiaries.filter(b => b.status !== 'active' && b.inactive_reason).forEach(b => {
      const reason = b.inactive_reason || 'Unspecified';
      reasons[reason] = (reasons[reason] || 0) + 1;
    });
    return Object.entries(reasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [beneficiaries]);

  // Replacements
  const replacementsInPeriod = useMemo(() => {
    return replacements
      .filter(r => {
        if (!dateRange?.from) return true;
        const date = new Date(r.created_at);
        return isWithinInterval(date, { start: dateRange.from, end: dateRange.to || dateRange.from });
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);
  }, [replacements, dateRange]);

  const allReplacements = useMemo(() => {
    return replacements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [replacements]);

  const filteredReplacements = useMemo(() => {
    if (!searchQuery.trim()) return allReplacements;
    const query = searchQuery.toLowerCase();
    return allReplacements.filter(r =>
      (r.original_name && r.original_name.toLowerCase().includes(query)) ||
      (r.new_child_full_name && r.new_child_full_name.toLowerCase().includes(query)) ||
      (r.reason && r.reason.toLowerCase().includes(query))
    );
  }, [allReplacements, searchQuery]);

  const handleExportReplacements = () => {
    const exportData = filteredReplacements.map(r => ({
      'Original Student': r.original_name || 'N/A',
      'Replacement': r.new_child_full_name || 'Pending',
      'Reason': r.reason || 'N/A',
      'Date': r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Replacements');
    XLSX.writeFile(wb, `replacements_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const GENDER_COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#6b7280'];
  const TYPE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} border-l-4 border-l-blue-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Beneficiaries</p>
                <p className="text-2xl font-bold mt-1">{statusDistribution.total}</p>
              </div>
              <div className="p-2 rounded-lg bg-info/10"><Users className="h-5 w-5 text-info" /></div>
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
              <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
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
              <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div>
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
              <div className="p-2 rounded-lg bg-warning/10"><Activity className="h-5 w-5 text-warning" /></div>
            </div>
            <Progress value={retentionRate} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Registration & Exit Trends</CardTitle>
            <CardDescription>Monthly new registrations vs exits over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.new} stopOpacity={0.3}/><stop offset="95%" stopColor={CHART_COLORS.new} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="exitGradLC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.inactive} stopOpacity={0.3}/><stop offset="95%" stopColor={CHART_COLORS.inactive} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip /><Legend />
                <Area type="monotone" dataKey="registrations" name="New Registrations" stroke={CHART_COLORS.new} fillOpacity={1} fill="url(#enrollGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="exits" name="Exits" stroke={CHART_COLORS.inactive} fillOpacity={1} fill="url(#exitGradLC)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={genderDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {genderDistribution.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Beneficiary Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={typeDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {typeDistribution.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inactive Reasons */}
        {inactiveReasons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" />Reasons for Inactivity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={inactiveReasons} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="reason" type="category" width={120} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS.inactive} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Replacements */}
        <Card className={inactiveReasons.length > 0 ? '' : 'lg:col-span-2'}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-primary" />Recent Replacements</CardTitle>
              <CardDescription>Beneficiaries who have been replaced</CardDescription>
            </div>
            {allReplacements.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowAllReplacements(true)} className="gap-2">
                <Eye className="h-4 w-4" />View All ({allReplacements.length})
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {replacementsInPeriod.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original</TableHead>
                      <TableHead>Replacement</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {replacementsInPeriod.map((r, i) => (
                      <TableRow key={r.id || i}>
                        <TableCell className="font-medium">{r.original_name || 'N/A'}</TableCell>
                        <TableCell>{r.new_child_full_name || 'Pending'}</TableCell>
                        <TableCell><Badge variant="secondary">{r.reason || 'N/A'}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
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

      {/* Dialog */}
      <Dialog open={showAllReplacements} onOpenChange={setShowAllReplacements}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-primary" />All Replacements</DialogTitle>
            <DialogDescription>Complete list ({allReplacements.length} total)</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportReplacements} className="gap-2">
              <Download className="h-4 w-4" />Export
            </Button>
          </div>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Original</TableHead>
                  <TableHead>Replacement</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReplacements.map((r, i) => (
                  <TableRow key={r.id || i}>
                    <TableCell className="font-medium">{r.original_name || 'N/A'}</TableCell>
                    <TableCell>{r.new_child_full_name || 'Pending'}</TableCell>
                    <TableCell><Badge variant="secondary">{r.reason || 'N/A'}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}