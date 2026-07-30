import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Users,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, LineChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { useOrganization } from "@/hooks/useOrganization";
import { useProgramEnrollmentStats } from "@/hooks/useProgramEnrollmentStats";

interface ProgramPerformanceSectionProps {
  programs: any[];
  programData: any;
  reportsData: any;
  isLoading: boolean;
}

export function ProgramPerformanceSection({ programs, programData, reportsData, isLoading }: ProgramPerformanceSectionProps) {
  const { programStats, trendData } = useProgramEnrollmentStats();

  const totalBeneficiaries = useMemo(() => {
    return programStats.reduce((sum, p) => sum + p.count, 0);
  }, [programStats]);

  // Program health indicators
  const programHealth = useMemo(() => {
    return programStats.map(program => {
      // Derive trend from trendData
      let trend = 0;
      if (trendData.length >= 2) {
        const last = (trendData[trendData.length - 1][program.programName] as number) || 0;
        const prev = (trendData[trendData.length - 2][program.programName] as number) || 0;
        trend = prev > 0 ? Math.round(((last - prev) / prev) * 100) : (last > 0 ? 100 : 0);
      }
      
      let health: 'active' | 'stable' | 'at-risk' = 'stable';
      if (program.count > 50 && trend > 0) health = 'active';
      else if (program.count < 10 || trend < -5) health = 'at-risk';
      
      return {
        ...program,
        trend,
        health,
        activityScore: Math.min(100, Math.max(0, 50 + trend * 5))
      };
    });
  }, [programStats, trendData]);

  // Radar chart data
  const radarData = useMemo(() => {
    return programStats.slice(0, 6).map(p => ({
      program: p.programName.split(' ')[0],
      beneficiaries: Math.min(100, (p.count / (totalBeneficiaries || 1)) * 100 * 5),
      growth: 50,
    }));
  }, [programStats, totalBeneficiaries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Program Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {programHealth.map((program, index) => {
          const cardStyle = getCardStyles((index % 6) as CardVariant);
          return (
            <Card key={program.programId} className={`${cardStyle} border-l-4 hover:shadow-lg transition-shadow`} style={{ borderLeftColor: program.color }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm truncate">{program.programName}</h3>
                  <Badge 
                    variant={program.health === 'active' ? 'default' : program.health === 'at-risk' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {program.health === 'active' ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Active</>
                    ) : program.health === 'at-risk' ? (
                      <><AlertTriangle className="h-3 w-3 mr-1" /> At Risk</>
                    ) : 'Stable'}
                  </Badge>
                </div>
                <p className="text-3xl font-bold">{program.count}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                  <div className="flex items-center gap-1">
                    {program.trend > 0 ? <TrendingUp className="h-3 w-3 text-success" /> 
                      : program.trend < 0 ? <TrendingDown className="h-3 w-3 text-destructive" /> : null}
                    <span className={`text-xs font-medium ${program.trend > 0 ? 'text-success' : program.trend < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {program.trend > 0 ? '+' : ''}{program.trend}%
                    </span>
                  </div>
                </div>
                <Progress value={program.activityScore} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Program Comparison Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Program Comparison</CardTitle>
            <CardDescription>Beneficiary count across all programs (from enrollments)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={programStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="programName" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {programStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Program Growth Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Growth Trends</CardTitle>
            <CardDescription>New enrollments per program over 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                {programStats.map(ps => (
                  <Line key={ps.programId} type="monotone" dataKey={ps.programName} stroke={ps.color} strokeWidth={2} dot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Program Radar Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Program Performance Radar</CardTitle>
            <CardDescription>Multi-dimensional program comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis dataKey="program" className="text-xs" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
                <Radar name="Beneficiaries" dataKey="beneficiaries" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Radar name="Growth" dataKey="growth" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
