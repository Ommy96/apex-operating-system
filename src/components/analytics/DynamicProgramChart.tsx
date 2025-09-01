import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { getCardStyles } from '@/lib/cardStyles';

interface ProgramData {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface DynamicProgramChartProps {
  data: ProgramData[];
  totalBeneficiaries: number;
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border rounded-xl p-3 shadow-elevation-2">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">
          Beneficiaries: <span className="font-medium text-primary">{data.count}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Percentage: <span className="font-medium text-accent">{data.percentage.toFixed(1)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export function DynamicProgramChart({ data, totalBeneficiaries, isLoading }: DynamicProgramChartProps) {
  if (isLoading) {
    return (
      <Card className={getCardStyles(3)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Program Distribution
            <Badge variant="secondary">Loading...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-80">
          <div className="space-y-3 text-center">
            <div className="w-full h-6 bg-muted rounded animate-pulse" />
            <div className="w-3/4 h-6 bg-muted rounded animate-pulse" />
            <div className="w-1/2 h-6 bg-muted rounded animate-pulse" />
            <p className="text-muted-foreground">Loading program data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={getCardStyles(3)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Program Distribution
          <Badge variant="secondary">{totalBeneficiaries} Total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                radius={[4, 4, 0, 0]}
                animationBegin={0}
                animationDuration={800}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Program Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.map((program, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-gradient-to-br from-background to-muted/20 border border-border/50 hover:shadow-elevation-1 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: program.color }}
                />
                <span className="text-sm font-medium text-foreground line-clamp-1">
                  {program.name}
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-foreground">{program.count}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {program.percentage.toFixed(1)}%
                  </span>
                  <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${program.percentage}%`,
                        backgroundColor: program.color
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}