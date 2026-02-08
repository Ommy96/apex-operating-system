import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  PieChartIcon,
  Activity
} from 'lucide-react';
import { ProgramStat, ProgramTrendPoint } from '@/hooks/useProgramEnrollmentStats';

interface DashboardTrendChartsProps {
  programStats: ProgramStat[];
  trendData?: ProgramTrendPoint[];
  isLoading?: boolean;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-medium text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Sparkline mini chart
const SparklineCard = ({ 
  title, value, change, trend, data, color
}: { 
  title: string; value: number | string; change: string; trend: 'up' | 'down';
  data: { value: number }[]; color: string;
}) => (
  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          trend === 'up' ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
            : 'bg-red-500/10 text-red-600 dark:text-red-400'
        }`}>
          {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change}
        </div>
      </div>
      <div className="h-16 -mx-4 -mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2}
              fill={`url(#gradient-${title.replace(/\s/g, '')})`} isAnimationActive={true}
              animationDuration={1500} animationEasing="ease-out" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

export function DashboardTrendCharts({ programStats, trendData = [], isLoading }: DashboardTrendChartsProps) {
  
  // Build sparkline data per program from trend data
  const sparklineMap = useMemo(() => {
    const map: Record<string, { value: number }[]> = {};
    programStats.forEach(ps => {
      map[ps.programName] = trendData.length > 0
        ? trendData.map(t => ({ value: (t[ps.programName] as number) || 0 }))
        : [{ value: ps.count }];
    });
    return map;
  }, [programStats, trendData]);

  const calculateChange = (data: { value: number }[]) => {
    if (data.length < 2) return { change: '+0%', trend: 'up' as const };
    const current = data[data.length - 1].value;
    const previous = data[data.length - 2].value;
    const changePercent = previous > 0 ? ((current - previous) / previous * 100) : 0;
    return {
      change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
      trend: changePercent >= 0 ? 'up' as const : 'down' as const
    };
  };

  // Comparison data for bar chart (last vs previous month)
  const comparisonData = useMemo(() => {
    if (trendData.length < 2) return [];
    const last = trendData[trendData.length - 1];
    const prev = trendData[trendData.length - 2];
    return programStats.map(ps => ({
      name: ps.programName,
      current: (last[ps.programName] as number) || 0,
      previous: (prev[ps.programName] as number) || 0,
      color: ps.color || 'hsl(221, 83%, 53%)',
    }));
  }, [trendData, programStats]);

  // Pie data
  const pieData = useMemo(() => {
    const total = programStats.reduce((s, p) => s + p.count, 0);
    return programStats.map(ps => ({
      name: ps.programName,
      value: ps.count,
      color: ps.color || 'hsl(221, 83%, 53%)',
      percentage: total > 0 ? ((ps.count / total) * 100).toFixed(1) : '0',
    }));
  }, [programStats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="border-0 shadow-lg"><CardContent className="p-4">
              <div className="h-24 bg-muted/30 animate-pulse rounded-lg" />
            </CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sparkline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {programStats.slice(0, 4).map(ps => {
          const data = sparklineMap[ps.programName] || [{ value: 0 }];
          return (
            <SparklineCard
              key={ps.programId}
              title={ps.programName}
              value={ps.count}
              {...calculateChange(data)}
              data={data}
              color={ps.color || 'hsl(221, 83%, 53%)'}
            />
          );
        })}
      </div>

      {/* Main Trend Chart */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                Program Growth Trends
              </CardTitle>
              <CardDescription className="mt-1">Beneficiary enrollment over the past 6 months</CardDescription>
            </div>
            <Badge variant="secondary" className="animate-pulse">Live Data</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {programStats.map(ps => (
                    <linearGradient key={ps.programId} id={`trend-${ps.programId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ps.color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={ps.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle"
                  formatter={(value) => <span className="text-foreground">{value}</span>} />
                {programStats.map((ps, idx) => (
                  <Area key={ps.programId} type="monotone" dataKey={ps.programName}
                    name={ps.programName} stroke={ps.color} strokeWidth={3}
                    fill={`url(#trend-${ps.programId})`} isAnimationActive={true}
                    animationDuration={1500 + idx * 300} animationEasing="ease-out" />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Comparison */}
        {comparisonData.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/5">
                  <BarChart3 className="h-5 w-5 text-secondary" />
                </div>
                Monthly Comparison
              </CardTitle>
              <CardDescription className="mt-1">Current vs previous month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle"
                      formatter={(value) => <span className="text-foreground text-sm">{value}</span>} />
                    <Bar dataKey="previous" name="Previous Month" fill="hsl(var(--muted-foreground))"
                      radius={[4, 4, 0, 0]} opacity={0.5} />
                    <Bar dataKey="current" name="Current Month" radius={[4, 4, 0, 0]}>
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Distribution Pie */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5">
                <PieChartIcon className="h-5 w-5 text-accent" />
              </div>
              Distribution Overview
            </CardTitle>
            <CardDescription className="mt-1">Current beneficiary distribution by program</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="h-[180px] w-[180px] sm:h-[200px] sm:w-[200px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                      paddingAngle={3} dataKey="value" isAnimationActive={true}
                      animationDuration={1500} animationEasing="ease-out">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full space-y-3">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">{item.percentage}%</span>
                      </div>
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Re-export types for backward compatibility
export type { DashboardTrendChartsProps };
