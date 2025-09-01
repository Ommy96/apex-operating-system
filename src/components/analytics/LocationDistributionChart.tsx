import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapPin } from 'lucide-react';
import { getCardStyles } from '@/lib/cardStyles';

interface LocationData {
  location: string;
  count: number;
  percentage: number;
}

interface LocationDistributionChartProps {
  data: LocationData[];
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

export function LocationDistributionChart({ data, isLoading }: LocationDistributionChartProps) {
  if (isLoading) {
    return (
      <Card className={getCardStyles(4)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location Distribution
            <Badge variant="secondary">Loading...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-80">
          <div className="space-y-3 text-center">
            <div className="w-full h-6 bg-muted rounded animate-pulse" />
            <div className="w-3/4 h-6 bg-muted rounded animate-pulse" />
            <div className="w-1/2 h-6 bg-muted rounded animate-pulse" />
            <p className="text-muted-foreground">Loading location data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topLocations = data.slice(0, 10); // Show top 10 locations

  return (
    <Card className={getCardStyles(4)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Location Distribution
          <Badge variant="secondary">{data.length} Locations</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topLocations}
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 50, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                type="category"
                dataKey="location"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                animationBegin={0}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Location Summary */}
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Top Locations</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topLocations.slice(0, 6).map((location, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-background to-muted/10 border border-border/50 hover:shadow-elevation-1 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-sm font-medium text-foreground">
                    {location.location}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">{location.count}</div>
                  <div className="text-xs text-muted-foreground">
                    {location.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}