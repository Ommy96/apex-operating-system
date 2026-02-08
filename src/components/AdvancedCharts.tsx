import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCardStyles } from '@/lib/cardStyles';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, BarChart3, Target, Calendar
} from 'lucide-react';
import { useProgramEnrollmentStats } from '@/hooks/useProgramEnrollmentStats';

interface AdvancedChartsProps {
  className?: string;
}

// Heatmap
const ActivityHeatmap = () => {
  const heatmapData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const data: any[] = [];
    days.forEach((day, dayIndex) => {
      hours.forEach(hour => {
        let value = Math.random() * 100;
        if (hour >= 8 && hour <= 17 && dayIndex < 5) value = Math.random() * 80 + 20;
        else if (hour < 6 || hour > 22) value = Math.random() * 20;
        data.push({ day, hour, value: Math.round(value), label: `${day} ${hour}:00` });
      });
    });
    return data;
  }, []);

  const maxValue = Math.max(...heatmapData.map((d: any) => d.value));
  const getHeatmapColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity < 0.2) return 'bg-primary/10';
    if (intensity < 0.4) return 'bg-primary/30';
    if (intensity < 0.6) return 'bg-primary/50';
    if (intensity < 0.8) return 'bg-primary/70';
    return 'bg-primary/90';
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Card className={getCardStyles(0)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Activity Heatmap<Badge variant="secondary">7 Days</Badge></CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex gap-1 ml-12">
            {[0, 6, 12, 18].map(hour => (
              <div key={hour} className="w-4 text-xs text-muted-foreground text-center">{hour}</div>
            ))}
          </div>
          {days.map(day => (
            <div key={day} className="flex items-center gap-1">
              <div className="w-10 text-xs text-muted-foreground text-right">{day}</div>
              <div className="flex gap-1">
                {hours.map(hour => {
                  const dataPoint = heatmapData.find((d: any) => d.day === day && d.hour === hour);
                  return (
                    <div key={`${day}-${hour}`}
                      className={`w-3 h-3 rounded-sm ${getHeatmapColor(dataPoint?.value || 0)} hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer`}
                      title={`${dataPoint?.label}: ${dataPoint?.value}% activity`} />
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex gap-1">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(intensity => (
                <div key={intensity} className="w-3 h-3 rounded-sm bg-primary" style={{ opacity: intensity }} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Small Multiples - now uses dynamic program data
const SmallMultiples = () => {
  const { programStats, trendData } = useProgramEnrollmentStats();

  const metrics = useMemo(() => {
    return programStats.slice(0, 4).map(ps => ({
      name: ps.programName,
      color: ps.color || 'hsl(var(--primary))',
      data: trendData.map(t => ({ month: t.month, value: (t[ps.programName] as number) || 0 })),
    }));
  }, [programStats, trendData]);

  return (
    <Card className={getCardStyles(1)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Program Comparison<Badge variant="secondary">Enrollment Trends</Badge></CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map(metric => (
            <div key={metric.name} className="space-y-2">
              <h4 className="text-sm font-medium text-foreground truncate">{metric.name}</h4>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metric.data}>
                    <Area type="monotone" dataKey="value" stroke={metric.color} fill={metric.color} fillOpacity={0.3} strokeWidth={2} />
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-lg">
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-sm" style={{ color: metric.color }}>{payload[0].value} enrolled</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Progress Ring
const ProgressRing = ({ value, max, title, subtitle }: { value: number; max: number; title: string; subtitle: string }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <div className="flex flex-col items-center p-4 space-y-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="hsl(var(--muted))" strokeWidth="8" fill="transparent" className="opacity-20" />
          <circle cx="50" cy="50" r="40" stroke="hsl(var(--primary))" strokeWidth="8" fill="transparent"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-foreground">{Math.round(percentage)}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
};

export function AdvancedCharts({ className = '' }: AdvancedChartsProps) {
  const { programStats, totalBeneficiaries, statsLoading } = useProgramEnrollmentStats();

  // Sparkline data
  const sparklineData = useMemo(() => {
    const gen = (points = 20) => Array.from({ length: points }, (_, i) => ({ x: i, value: Math.random() * 100 + (Math.sin(i * 0.3) * 20) }));
    return { beneficiaries: gen(), programs: gen(), completion: gen(), satisfaction: gen() };
  }, []);

  const Sparkline = ({ data, title, value, change, trend }: { data: any[]; title: string; value: string; change: string; trend: 'up' | 'down' }) => (
    <div className="p-4 rounded-lg border bg-gradient-to-r from-background to-muted/20 hover:from-muted/20 hover:to-muted/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold text-foreground">{value}</p></div>
        <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-success' : 'text-destructive'}`}>
          {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span className="text-sm font-medium">{change}</span>
        </div>
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey="value" stroke={trend === 'up' ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <ActivityHeatmap />

      <Card className={getCardStyles(2)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Trend Indicators<Badge variant="secondary">Live</Badge></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Sparkline data={sparklineData.beneficiaries} title="Total Beneficiaries"
              value={statsLoading ? "..." : totalBeneficiaries.toString()} change="+12.5%" trend="up" />
            <Sparkline data={sparklineData.programs} title="Active Programs"
              value={statsLoading ? "..." : programStats.length.toString()} change="+8.3%" trend="up" />
            <Sparkline data={sparklineData.completion} title="Completion Rate" value="87%" change="-2.1%" trend="down" />
            <Sparkline data={sparklineData.satisfaction} title="Satisfaction" value="4.7" change="+0.3" trend="up" />
          </div>
        </CardContent>
      </Card>

      <SmallMultiples />

      {/* Progress Rings - dynamic from programs */}
      <Card className={getCardStyles(3)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Program Enrollment<Badge variant="secondary">By Program</Badge></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {programStats.slice(0, 4).map(ps => (
              <ProgressRing key={ps.programId}
                value={ps.count}
                max={totalBeneficiaries || 1}
                title={ps.programName}
                subtitle={`${ps.count} enrolled`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className={getCardStyles(4)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Monthly Activity Calendar<Badge variant="secondary">Calendar View</Badge></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
              <div key={day} className="text-xs text-muted-foreground font-medium p-2">{day}</div>
            ))}
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 6;
              const isCurrentMonth = day > 0 && day <= 30;
              const activity = isCurrentMonth ? Math.random() : 0;
              const getActivityColor = () => {
                if (!isCurrentMonth) return 'bg-transparent';
                if (activity < 0.2) return 'bg-muted/30';
                if (activity < 0.4) return 'bg-primary/30';
                if (activity < 0.6) return 'bg-primary/50';
                if (activity < 0.8) return 'bg-primary/70';
                return 'bg-primary/90';
              };
              return (
                <div key={i} className={`h-8 w-8 rounded-md ${getActivityColor()} flex items-center justify-center hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer`}>
                  {isCurrentMonth && <span className={`text-xs ${activity > 0.5 ? 'text-white' : 'text-foreground'}`}>{day}</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
