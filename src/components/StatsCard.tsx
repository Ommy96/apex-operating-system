import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorVariant?: 'blue' | 'emerald' | 'purple' | 'orange' | 'rose' | 'cyan';
  children?: React.ReactNode;
}

const colorVariants = {
  blue: 'from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800',
  emerald: 'from-emerald-500/10 to-green-500/10 border-emerald-200 dark:border-emerald-800',
  purple: 'from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800',
  orange: 'from-orange-500/10 to-amber-500/10 border-orange-200 dark:border-orange-800',
  rose: 'from-rose-500/10 to-red-500/10 border-rose-200 dark:border-rose-800',
  cyan: 'from-cyan-500/10 to-teal-500/10 border-cyan-200 dark:border-cyan-800',
};

const iconColors = {
  blue: 'text-blue-500 bg-blue-500/10',
  emerald: 'text-emerald-500 bg-emerald-500/10',
  purple: 'text-purple-500 bg-purple-500/10',
  orange: 'text-orange-500 bg-orange-500/10',
  rose: 'text-rose-500 bg-rose-500/10',
  cyan: 'text-cyan-500 bg-cyan-500/10',
};

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  colorVariant = 'blue',
  children 
}: StatsCardProps) {
  return (
    <Card className={`bg-gradient-to-br ${colorVariants[colorVariant]} border shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className={`p-2 rounded-lg ${iconColors[colorVariant]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children ? (
          children
        ) : (
          <>
            <div className="text-xl sm:text-3xl font-bold truncate">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
