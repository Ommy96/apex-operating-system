import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Users,
  Activity,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, Line, LineChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { getCardStyles, CardVariant } from "@/lib/cardStyles";
import { format, startOfMonth, subMonths, eachMonthOfInterval, isWithinInterval } from "date-fns";

interface ProgramPerformanceSectionProps {
  programs: any[];
  programData: {
    children: any[];
    feeding: any[];
    kipawa: any[];
    selfEmpowerment: any[];
    familyAdoption: any[];
    supportGroups: any[];
    medical: any[];
  } | null;
  reportsData: any;
  isLoading: boolean;
}

const PROGRAM_COLORS = {
  Education: '#3b82f6',
  'Feeding Program': '#10b981',
  'Kipawa Sato': '#f59e0b',
  'Self Empowerment': '#8b5cf6',
  'Family Adoption': '#ec4899',
  'Support Groups': '#6366f1',
  'Medical': '#ef4444'
};

export function ProgramPerformanceSection({ programs, programData, reportsData, isLoading }: ProgramPerformanceSectionProps) {
  // Program summary with counts
  const programSummary = useMemo(() => {
    if (!programData) return [];
    
    return [
      { 
        name: 'Education', 
        count: programData.children?.length || 0, 
        color: PROGRAM_COLORS.Education,
        icon: '📚',
        trend: 5
      },
      { 
        name: 'Feeding Program', 
        count: programData.feeding?.length || 0, 
        color: PROGRAM_COLORS['Feeding Program'],
        icon: '🍽️',
        trend: 12
      },
      { 
        name: 'Kipawa Sato', 
        count: programData.kipawa?.length || 0, 
        color: PROGRAM_COLORS['Kipawa Sato'],
        icon: '⚽',
        trend: -2
      },
      { 
        name: 'Self Empowerment', 
        count: programData.selfEmpowerment?.length || 0, 
        color: PROGRAM_COLORS['Self Empowerment'],
        icon: '💼',
        trend: 8
      },
      { 
        name: 'Family Adoption', 
        count: programData.familyAdoption?.reduce((sum: number, f: any) => sum + (f.no_of_beneficiaries || 1), 0) || 0, 
        color: PROGRAM_COLORS['Family Adoption'],
        icon: '👨‍👩‍👧‍👦',
        trend: 3
      },
      { 
        name: 'Support Groups', 
        count: programData.supportGroups?.reduce((sum: number, g: any) => sum + (g.member_count || 0), 0) || 0, 
        color: PROGRAM_COLORS['Support Groups'],
        icon: '🤝',
        trend: 15
      },
      { 
        name: 'Medical', 
        count: programData.medical?.length || 0, 
        color: PROGRAM_COLORS['Medical'],
        icon: '🏥',
        trend: 0
      }
    ];
  }, [programData]);

  // Total beneficiaries
  const totalBeneficiaries = useMemo(() => {
    return programSummary.reduce((sum, p) => sum + p.count, 0);
  }, [programSummary]);

  // Program growth trends
  const programGrowth = useMemo(() => {
    if (!programData) return [];
    
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
        Education: countInMonth(programData.children),
        Feeding: countInMonth(programData.feeding),
        Kipawa: countInMonth(programData.kipawa),
        SelfEmp: countInMonth(programData.selfEmpowerment)
      };
    });
  }, [programData]);

  // Program health indicators
  const programHealth = useMemo(() => {
    return programSummary.map(program => {
      // Calculate health based on count, trend, and activity
      let health: 'active' | 'stable' | 'at-risk' = 'stable';
      
      if (program.count > 50 && program.trend > 0) health = 'active';
      else if (program.count < 10 || program.trend < -5) health = 'at-risk';
      
      return {
        ...program,
        health,
        activityScore: Math.min(100, Math.max(0, 50 + program.trend * 5))
      };
    });
  }, [programSummary]);

  // Radar chart data for program comparison
  const radarData = useMemo(() => {
    return programSummary.slice(0, 6).map(p => ({
      program: p.name.split(' ')[0],
      beneficiaries: Math.min(100, (p.count / (totalBeneficiaries || 1)) * 100 * 5),
      growth: Math.min(100, 50 + (p.trend * 3)),
      activity: Math.random() * 40 + 60 // Placeholder for actual activity data
    }));
  }, [programSummary, totalBeneficiaries]);

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
            <Card key={program.name} className={`${cardStyle} border-l-4 hover:shadow-lg transition-shadow`} style={{ borderLeftColor: program.color }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{program.icon}</span>
                    <h3 className="font-semibold text-sm">{program.name}</h3>
                  </div>
                  <Badge 
                    variant={program.health === 'active' ? 'default' : program.health === 'at-risk' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {program.health === 'active' ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Active</>
                    ) : program.health === 'at-risk' ? (
                      <><AlertTriangle className="h-3 w-3 mr-1" /> At Risk</>
                    ) : (
                      'Stable'
                    )}
                  </Badge>
                </div>
                <p className="text-3xl font-bold">{program.count}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">Beneficiaries</p>
                  <div className="flex items-center gap-1">
                    {program.trend > 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : program.trend < 0 ? (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    ) : null}
                    <span className={`text-xs font-medium ${program.trend > 0 ? 'text-emerald-500' : program.trend < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
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
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Program Comparison
            </CardTitle>
            <CardDescription>Beneficiary count across all programs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={programSummary}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {programSummary.map((entry, index) => (
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
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Growth Trends
            </CardTitle>
            <CardDescription>New enrollments per program over 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={programGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Education" stroke={PROGRAM_COLORS.Education} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Feeding" stroke={PROGRAM_COLORS['Feeding Program']} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Kipawa" stroke={PROGRAM_COLORS['Kipawa Sato']} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="SelfEmp" stroke={PROGRAM_COLORS['Self Empowerment']} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Program Radar Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Program Performance Radar
            </CardTitle>
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
                <Radar name="Activity" dataKey="activity" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
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
