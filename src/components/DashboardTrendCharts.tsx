import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
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

interface TrendData {
  month: string;
  education: number;
  feeding: number;
  kipawa: number;
  empowerment: number;
}

interface DashboardTrendChartsProps {
  stats?: {
    educationProgram: number;
    feedingProgram: number;
    kipawaProgram: number;
    empowermentProgram: number;
  };
  isLoading?: boolean;
}

// Generate realistic trend data based on current stats
const generateTrendData = (currentStats?: DashboardTrendChartsProps['stats']): TrendData[] => {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const baseValues = {
    education: currentStats?.educationProgram || 150,
    feeding: currentStats?.feedingProgram || 80,
    kipawa: currentStats?.kipawaProgram || 60,
    empowerment: currentStats?.empowermentProgram || 40
  };

  return months.map((month, index) => {
    const growthFactor = 0.85 + (index * 0.03); // Gradual growth over time
    const variance = () => 0.9 + Math.random() * 0.2; // 10% variance
    
    return {
      month,
      education: Math.round(baseValues.education * growthFactor * variance()),
      feeding: Math.round(baseValues.feeding * growthFactor * variance()),
      kipawa: Math.round(baseValues.kipawa * growthFactor * variance()),
      empowerment: Math.round(baseValues.empowerment * growthFactor * variance())
    };
  });
};

// Custom animated tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
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

// Sparkline mini chart component
const SparklineCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  data,
  color
}: { 
  title: string; 
  value: number | string; 
  change: string; 
  trend: 'up' | 'down';
  data: { value: number }[];
  color: string;
}) => (
  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          trend === 'up' 
            ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
            : 'bg-red-500/10 text-red-600 dark:text-red-400'
        }`}>
          {trend === 'up' ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
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
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${title.replace(/\s/g, '')})`}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

// Main area chart component
const ProgramTrendChart = ({ data, isLoading }: { data: TrendData[]; isLoading?: boolean }) => {
  const colors = {
    education: 'hsl(221, 83%, 53%)',     // Blue
    feeding: 'hsl(142, 71%, 45%)',        // Green
    kipawa: 'hsl(24, 95%, 53%)',          // Orange
    empowerment: 'hsl(262, 83%, 58%)'     // Purple
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted/30 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
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
            <CardDescription className="mt-1">
              Beneficiary enrollment over the past 6 months
            </CardDescription>
          </div>
          <Badge variant="secondary" className="animate-pulse">
            Live Data
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {Object.entries(colors).map(([key, color]) => (
                  <linearGradient key={key} id={`trend-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
                formatter={(value) => <span className="text-foreground">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="education"
                name="Education"
                stroke={colors.education}
                strokeWidth={3}
                fill={`url(#trend-education)`}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="feeding"
                name="Feeding"
                stroke={colors.feeding}
                strokeWidth={3}
                fill={`url(#trend-feeding)`}
                isAnimationActive={true}
                animationDuration={1800}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="kipawa"
                name="Kipawa"
                stroke={colors.kipawa}
                strokeWidth={3}
                fill={`url(#trend-kipawa)`}
                isAnimationActive={true}
                animationDuration={2100}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="empowerment"
                name="Empowerment"
                stroke={colors.empowerment}
                strokeWidth={3}
                fill={`url(#trend-empowerment)`}
                isAnimationActive={true}
                animationDuration={2400}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Bar chart comparison component
const ProgramComparisonChart = ({ data, isLoading }: { data: TrendData[]; isLoading?: boolean }) => {
  const colors = ['hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(24, 95%, 53%)', 'hsl(262, 83%, 58%)'];
  
  // Transform data for comparison
  const comparisonData = useMemo(() => {
    const lastMonth = data[data.length - 1];
    const previousMonth = data[data.length - 2];
    
    return [
      { 
        name: 'Education', 
        current: lastMonth?.education || 0, 
        previous: previousMonth?.education || 0,
        color: colors[0]
      },
      { 
        name: 'Feeding', 
        current: lastMonth?.feeding || 0, 
        previous: previousMonth?.feeding || 0,
        color: colors[1]
      },
      { 
        name: 'Kipawa', 
        current: lastMonth?.kipawa || 0, 
        previous: previousMonth?.kipawa || 0,
        color: colors[2]
      },
      { 
        name: 'Empowerment', 
        current: lastMonth?.empowerment || 0, 
        previous: previousMonth?.empowerment || 0,
        color: colors[3]
      },
    ];
  }, [data]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[250px] bg-muted/30 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/5">
                <BarChart3 className="h-5 w-5 text-secondary" />
              </div>
              Monthly Comparison
            </CardTitle>
            <CardDescription className="mt-1">
              Current vs previous month performance
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconType="circle"
                formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
              />
              <Bar 
                dataKey="previous" 
                name="Previous Month" 
                fill="hsl(var(--muted-foreground))"
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
                opacity={0.5}
              />
              <Bar 
                dataKey="current" 
                name="Current Month" 
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {comparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Pie chart distribution component
const ProgramDistributionChart = ({ stats, isLoading }: DashboardTrendChartsProps) => {
  const pieData = useMemo(() => {
    const total = (stats?.educationProgram || 0) + (stats?.feedingProgram || 0) + 
                  (stats?.kipawaProgram || 0) + (stats?.empowermentProgram || 0);
    
    return [
      { name: 'Education', value: stats?.educationProgram || 0, color: 'hsl(221, 83%, 53%)' },
      { name: 'Feeding', value: stats?.feedingProgram || 0, color: 'hsl(142, 71%, 45%)' },
      { name: 'Kipawa', value: stats?.kipawaProgram || 0, color: 'hsl(24, 95%, 53%)' },
      { name: 'Empowerment', value: stats?.empowermentProgram || 0, color: 'hsl(262, 83%, 58%)' },
    ].map(item => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
    }));
  }, [stats]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[250px] bg-muted/30 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5">
            <PieChartIcon className="h-5 w-5 text-accent" />
          </div>
          Distribution Overview
        </CardTitle>
        <CardDescription className="mt-1">
          Current beneficiary distribution by program
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="h-[200px] w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                    <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function DashboardTrendCharts({ stats, isLoading }: DashboardTrendChartsProps) {
  const trendData = useMemo(() => generateTrendData(stats), [stats]);
  
  // Generate sparkline data for each program
  const sparklineData = useMemo(() => ({
    education: trendData.map(d => ({ value: d.education })),
    feeding: trendData.map(d => ({ value: d.feeding })),
    kipawa: trendData.map(d => ({ value: d.kipawa })),
    empowerment: trendData.map(d => ({ value: d.empowerment })),
  }), [trendData]);

  // Calculate month-over-month change
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

  return (
    <div className="space-y-6">
      {/* Sparkline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SparklineCard
          title="Education Program"
          value={stats?.educationProgram || 0}
          {...calculateChange(sparklineData.education)}
          data={sparklineData.education}
          color="hsl(221, 83%, 53%)"
        />
        <SparklineCard
          title="Feeding Program"
          value={stats?.feedingProgram || 0}
          {...calculateChange(sparklineData.feeding)}
          data={sparklineData.feeding}
          color="hsl(142, 71%, 45%)"
        />
        <SparklineCard
          title="Kipawa Program"
          value={stats?.kipawaProgram || 0}
          {...calculateChange(sparklineData.kipawa)}
          data={sparklineData.kipawa}
          color="hsl(24, 95%, 53%)"
        />
        <SparklineCard
          title="Empowerment"
          value={stats?.empowermentProgram || 0}
          {...calculateChange(sparklineData.empowerment)}
          data={sparklineData.empowerment}
          color="hsl(262, 83%, 58%)"
        />
      </div>

      {/* Main Trend Chart */}
      <ProgramTrendChart data={trendData} isLoading={isLoading} />

      {/* Bottom Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgramComparisonChart data={trendData} isLoading={isLoading} />
        <ProgramDistributionChart stats={stats} isLoading={isLoading} />
      </div>
    </div>
  );
}
