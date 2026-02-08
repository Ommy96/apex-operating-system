import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  GraduationCap, 
  TrendingUp, 
  AlertTriangle,
  Download,
  Award,
  BookOpen,
  Target,
  Users
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { downloadExcel } from "@/lib/downloadUtils";
import { toast } from "sonner";

interface AcademicPerformanceSectionProps {
  academicRecords: any[];
  beneficiaries: any[];
  // Keep backward compatibility
  children?: any[];
  isLoading: boolean;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444'];

export function AcademicPerformanceSection({ academicRecords, beneficiaries, children, isLoading }: AcademicPerformanceSectionProps) {
  const people = beneficiaries || children || [];

  // Performance by term (beneficiary_academics uses total_marks/out_of)
  const termPerformance = useMemo(() => {
    if (!academicRecords.length) return [];
    const termStats: Record<string, { totalMarks: number; totalOutOf: number; count: number }> = {};
    academicRecords.forEach(record => {
      const term = record.term || 'Unknown';
      if (!termStats[term]) termStats[term] = { totalMarks: 0, totalOutOf: 0, count: 0 };
      if (record.total_marks != null) {
        termStats[term].totalMarks += record.total_marks;
        termStats[term].totalOutOf += (record.out_of || 100);
        termStats[term].count++;
      }
    });
    return Object.entries(termStats)
      .map(([term, stats]) => ({
        term,
        average: stats.totalOutOf > 0 ? Math.round((stats.totalMarks / stats.totalOutOf) * 100) : 0,
        count: stats.count
      }))
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [academicRecords]);

  // Top performers by average marks
  const topPerformers = useMemo(() => {
    if (!academicRecords.length || !people.length) return [];
    const scores: Record<string, { totalMarks: number; totalOutOf: number; count: number }> = {};
    academicRecords.forEach(record => {
      const id = record.beneficiary_id;
      if (!scores[id]) scores[id] = { totalMarks: 0, totalOutOf: 0, count: 0 };
      if (record.total_marks != null) {
        scores[id].totalMarks += record.total_marks;
        scores[id].totalOutOf += (record.out_of || 100);
        scores[id].count++;
      }
    });
    return Object.entries(scores)
      .map(([id, stats]) => {
        const person = people.find(p => p.id === id);
        const name = person?.display_name || (person ? `${person.first_name} ${person.last_name}` : 'Unknown');
        return {
          id, name,
          average: stats.totalOutOf > 0 ? Math.round((stats.totalMarks / stats.totalOutOf) * 100) : 0,
          recordCount: stats.count
        };
      })
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);
  }, [academicRecords, people]);

  // At-risk (below 40%)
  const atRiskStudents = useMemo(() => {
    if (!academicRecords.length || !people.length) return [];
    const scores: Record<string, { totalMarks: number; totalOutOf: number; count: number }> = {};
    academicRecords.forEach(record => {
      const id = record.beneficiary_id;
      if (!scores[id]) scores[id] = { totalMarks: 0, totalOutOf: 0, count: 0 };
      if (record.total_marks != null) {
        scores[id].totalMarks += record.total_marks;
        scores[id].totalOutOf += (record.out_of || 100);
        scores[id].count++;
      }
    });
    return Object.entries(scores)
      .map(([id, stats]) => {
        const person = people.find(p => p.id === id);
        return {
          id,
          name: person?.display_name || 'Unknown',
          institution: person?.institution_name || 'N/A',
          average: stats.totalOutOf > 0 ? Math.round((stats.totalMarks / stats.totalOutOf) * 100) : 0,
          recordCount: stats.count
        };
      })
      .filter(s => s.average < 40 && s.recordCount > 0)
      .sort((a, b) => a.average - b.average)
      .slice(0, 10);
  }, [academicRecords, people]);

  // Grade distribution
  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    academicRecords.forEach(r => {
      const grade = r.overall_grade || 'Ungraded';
      counts[grade] = (counts[grade] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [academicRecords]);

  // Academic level distribution from beneficiaries
  const academicLevelDist = useMemo(() => {
    const counts: Record<string, number> = {};
    people.filter(p => p.beneficiary_type === 'student').forEach(p => {
      const level = p.academic_level || 'Not Specified';
      counts[level] = (counts[level] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [people]);

  const handleExport = () => {
    if (!academicRecords.length) { toast.error("No academic records to export"); return; }
    const exportData = academicRecords.map(record => {
      const person = people.find(p => p.id === record.beneficiary_id);
      return {
        "Name": person?.display_name || 'Unknown',
        "Institution": person?.institution_name || 'N/A',
        "Academic Year": record.academic_year,
        "Term": record.term,
        "Total Marks": record.total_marks,
        "Out Of": record.out_of,
        "Position": record.position || 'N/A',
        "Overall Grade": record.overall_grade || 'N/A',
        "Remarks": record.remarks || ''
      };
    });
    downloadExcel(exportData, 'academic_performance_report', 'Academic Performance');
    toast.success("Academic performance report exported");
  };

  if (isLoading) {
    return (<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>);
  }

  const totalRecords = academicRecords.length;
  const uniqueStudents = new Set(academicRecords.map(r => r.beneficiary_id)).size;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} border-l-4 border-l-blue-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold mt-1">{totalRecords}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10"><BookOpen className="h-5 w-5 text-blue-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${getCardStyles(1 as CardVariant)} border-l-4 border-l-emerald-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Students Tracked</p>
                <p className="text-2xl font-bold mt-1">{uniqueStudents}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10"><Users className="h-5 w-5 text-emerald-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${getCardStyles(2 as CardVariant)} border-l-4 border-l-amber-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Top Performers</p>
                <p className="text-2xl font-bold mt-1">{topPerformers.filter(s => s.average >= 70).length}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10"><Award className="h-5 w-5 text-amber-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${getCardStyles(3 as CardVariant)} border-l-4 border-l-red-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">At-Risk Students</p>
                <p className="text-2xl font-bold mt-1">{atRiskStudents.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleExport} variant="outline"><Download className="h-4 w-4 mr-2" />Export Academic Results</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Term Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Performance by Term</CardTitle>
            <CardDescription>Average scores across terms</CardDescription>
          </CardHeader>
          <CardContent>
            {termPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={termPerformance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="term" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                    {termPerformance.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground"><BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No academic records available</p></div>
            )}
          </CardContent>
        </Card>

        {/* Academic Level Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />Academic Level Distribution</CardTitle>
            <CardDescription>Students by academic level</CardDescription>
          </CardHeader>
          <CardContent>
            {academicLevelDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={academicLevelDist}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {academicLevelDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground"><p>No student data available</p></div>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-500" />Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {topPerformers.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Average</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {topPerformers.map((s, i) => (
                      <TableRow key={s.id}>
                        <TableCell>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right"><Badge variant={s.average >= 80 ? "default" : "secondary"}>{s.average}%</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><p>No performance data available</p></div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* At-Risk */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />At-Risk Students</CardTitle>
            <CardDescription>Below 40% average performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {atRiskStudents.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Institution</TableHead><TableHead className="text-right">Average</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {atRiskStudents.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.institution}</TableCell>
                        <TableCell className="text-right"><Badge variant="destructive">{s.average}%</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><Award className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No at-risk students identified</p></div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
