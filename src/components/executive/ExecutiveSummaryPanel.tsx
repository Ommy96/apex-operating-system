import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, Target, Briefcase, Activity, FileText, MapPin, 
  DollarSign, AlertTriangle, TrendingUp, Heart
} from "lucide-react";
import { ExecutiveSummary } from "@/hooks/useExecutiveAnalytics";
import { Skeleton } from "@/components/ui/skeleton";

interface ExecutiveSummaryPanelProps {
  summary: ExecutiveSummary;
  isLoading: boolean;
}

interface KpiItem {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  suffix?: string;
  prefix?: string;
  format?: boolean;
  alert?: boolean;
}

const kpiConfig: KpiItem[] = [
  { key: 'totalActiveBeneficiaries', label: 'Active Beneficiaries', icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'totalPrograms', label: 'Active Programs', icon: Target, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'totalProjects', label: 'Active Projects', icon: Briefcase, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  { key: 'totalActiveStaff', label: 'Active Staff', icon: Activity, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'totalReports', label: 'Total Reports', icon: FileText, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
  { key: 'totalVisitations', label: 'Total Visitations', icon: MapPin, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10' },
  { key: 'totalServices', label: 'Active Services', icon: Heart, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10' },
  { key: 'avgStaffPerformance', label: 'Avg Staff Score', icon: TrendingUp, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', suffix: '/100' },
  { key: 'totalDonorFunds', label: 'Donor Funds', icon: DollarSign, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', prefix: 'KES ', format: true },
  { key: 'riskAlerts', label: 'Risk Alerts', icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', alert: true },
];

function formatNumber(value: number, format?: boolean, prefix?: string, suffix?: string): string {
  let formatted = format
    ? value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString()
    : value.toLocaleString();
  if (prefix) formatted = prefix + formatted;
  if (suffix) formatted += suffix;
  return formatted;
}

export function ExecutiveSummaryPanel({ summary, isLoading }: ExecutiveSummaryPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpiConfig.map((kpi) => {
        const value = summary[kpi.key as keyof ExecutiveSummary] as number;
        const Icon = kpi.icon;
        return (
          <Card
            key={kpi.key}
            className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
              kpi.alert && value > 0 ? 'ring-1 ring-red-300 dark:ring-red-700' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground truncate">{kpi.label}</span>
                <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                </div>
              </div>
              <p className={`text-xl font-bold tracking-tight ${kpi.alert && value > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {formatNumber(value, (kpi as any).format, (kpi as any).prefix, (kpi as any).suffix)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
