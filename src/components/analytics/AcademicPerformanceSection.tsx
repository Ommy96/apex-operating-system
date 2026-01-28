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
  TrendingDown,
  AlertTriangle,
  Download,
  Award,
  BookOpen,
  Target,
  Users
} from "lucide-react";
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, Area, AreaChart } from "recharts";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { downloadExcel } from "@/lib/downloadUtils";
import { toast } from "sonner";

interface AcademicPerformanceSectionProps {
  academicRecords: any[];
  children: any[];
  isLoading: boolean;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444'];

export function AcademicPerformanceSection({ academicRecords, children, isLoading }: AcademicPerformanceSectionProps) {
  // Performance by subject
  const subjectPerformance = useMemo(() => {
    if (!academicRecords.length) return [];
    
    const subjectStats: Record<string, { total: number; count: number; scores: number[] }> = {};
    
    academicRecords.forEach(record => {
      const subject = record.subject || 'General';
      if (!subjectStats[subject]) {
        subjectStats[subject] = { total: 0, count: 0, scores: [] };
      }
      if (record.score != null) {
        subjectStats[subject].total += record.score;
        subjectStats[subject].count++;
        subjectStats[subject].scores.push(record.score);
      }
    });

    return Object.entries(subjectStats)
      .map(([subject, stats]) => ({
        subject,
        average: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
        count: stats.count,
        highest: Math.max(...stats.scores, 0),
        lowest: Math.min(...stats.scores, 100)
      }))
      .sort((a, b) => b.average - a.average);
  }, [academicRecords]);

  // Performance by term
  const termPerformance = useMemo(() => {
    if (!academicRecords.length) return [];
    
    const termStats: Record<string, { total: number; count: number }> = {};
    
    academicRecords.forEach(record => {
      const term = record.term || 'Unknown';
      if (!termStats[term]) {
        termStats[term] = { total: 0, count: 0 };
      }
      if (record.score != null) {
        termStats[term].total += record.score;
        termStats[term].count++;
      }
    });

    return Object.entries(termStats)
      .map(([term, stats]) => ({
        term,
        average: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
        count: stats.count
      }))
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [academicRecords]);

  // Top performers
  const topPerformers = useMemo(() => {
    if (!academicRecords.length || !children.length) return [];
    
    const childScores: Record<string, { total: number; count: number; name: string }> = {};
    
    academicRecords.forEach(record => {
      if (!childScores[record.child_id]) {
        const child = children.find(c => c.id === record.child_id);
        childScores[record.child_id] = { 
          total: 0, 
          count: 0, 
          name: child ? `${child.first_name} ${child.last_name}` : 'Unknown'
        };
      }
      if (record.score != null) {
        childScores[record.child_id].total += record.score;
        childScores[record.child_id].count++;
      }
    });

    return Object.entries(childScores)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        average: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
        recordCount: stats.count
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);
  }, [academicRecords, children]);

  // At-risk students (low performers)
  const atRiskStudents = useMemo(() => {
    if (!academicRecords.length || !children.length) return [];
    
    const childScores: Record<string, { total: number; count: number; name: string; institution: string }> = {};
    
    academicRecords.forEach(record => {
      if (!childScores[record.child_id]) {
        const child = children.find(c => c.id === record.child_id);
        childScores[record.child_id] = { 
          total: 0, 
          count: 0, 
          name: child ? `${child.first_name} ${child.last_name}` : 'Unknown',
          institution: child?.institution_name || 'N/A'
        };
      }
      if (record.score != null) {
        childScores[record.child_id].total += record.score;
        childScores[record.child_id].count++;
      }
    });

    return Object.entries(childScores)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        institution: stats.institution,
        average: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
        recordCount: stats.count
      }))
      .filter(s => s.average < 50 && s.recordCount > 0)
      .sort((a, b) => a.average - b.average)
      .slice(0, 10);
  }, [academicRecords, children]);

  // Academic level distribution
  const academicLevelDist = useMemo(() => {
    if (!children.length) return [];
    
    const counts: Record<string, number> = {};
    children.forEach(child => {
      const level = child.academic_level || 'Not Specified';
      counts[level] = (counts[level] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [children]);

  // Export academic results
  const handleExport = () => {
    if (!academicRecords.length) {
      toast.error("No academic records to export");
      return;
    }

    const exportData = academicRecords.map(record => {
      const child = children.find(c => c.id === record.child_id);
      return {
        "Student Name": child ? `${child.first_name} ${child.last_name}` : 'Unknown',
        "Institution": child?.institution_name || 'N/A',
        "Academic Level": child?.academic_level || 'N/A',
        "Academic Year": record.academic_year,
        "Term": record.term,
        "Subject": record.subject || 'General',
        "Score": record.score,
        "Grade": record.grade || 'N/A',
        "Remarks": record.remarks || ''
      };
    });

    downloadExcel(exportData, 'academic_performance_report', 'Academic Performance');
    toast.success("Academic performance report exported");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const overallAverage = academicRecords.length > 0
    ? Math.round(academicRecords.reduce((sum, r) => sum + (r.score || 0), 0) / academicRecords.filter(r => r.score != null).length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${getCardStyles(0 as CardVariant)} border-l-4 border-l-blue-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Overall Average</p>
                <p className="text-2xl font-bold mt-1">{overallAverage}%</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles(1 as CardVariant)} border-l-4 border-l-emerald-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold mt-1">{academicRecords.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <BookOpen className="h-5 w-5 text-emerald-500" />
              </div>
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
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Award className="h-5 w-5 text-amber-500" />
              </div>
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
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export All Academic Results
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Performance by Subject
            </CardTitle>
            <CardDescription>Average scores across all subjects</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} className="text-xs" />
                  <YAxis dataKey="subject" type="category" width={100} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="average" radius={[0, 4, 4, 0]}>
                    {subjectPerformance.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No academic records available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Level Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Academic Level Distribution
            </CardTitle>
            <CardDescription>Students by academic level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={academicLevelDist}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {academicLevelDist.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Top Performers
            </CardTitle>
            <CardDescription>Highest achieving students</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {topPerformers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPerformers.map((student, index) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={student.average >= 80 ? "default" : "secondary"}>
                            {student.average}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No performance data available</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* At-Risk Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              At-Risk Students
            </CardTitle>
            <CardDescription>Students with declining or low performance (below 50%)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {atRiskStudents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {atRiskStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{student.institution}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{student.average}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No at-risk students identified</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
