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
  { key: 'totalActiveBeneficiaries', label: 'Active Beneficiaries', icon: Users, color: 'text-info', bg: 'bg-info/10' },
  { key: 'totalPrograms', label: 'Active Programs', icon: Target, color: 'text-success', bg: 'bg-success/10' },
  { key: 'totalProjects', label: 'Active Projects', icon: Briefcase, color: 'text-info', bg: 'bg-info/10' },
  { key: 'totalActiveStaff', label: 'Active Staff', icon: Activity, color: 'text-warning', bg: 'bg-warning/10' },
  { key: 'totalReports', label: 'Total Reports', icon: FileText, color: 'text-info', bg: 'bg-info/10' },
  { key: 'totalVisitations', label: 'Total Visitations', icon: MapPin, color: 'text-success', bg: 'bg-success/10' },
  { key: 'totalServices', label: 'Active Services', icon: Heart, color: 'text-destructive', bg: 'bg-destructive/10' },
  { key: 'avgStaffPerformance', label: 'Avg Staff Score', icon: TrendingUp, color: 'text-info', bg: 'bg-info/10', suffix: '/100' },
  { key: 'totalDonorFunds', label: 'Donor Funds', icon: DollarSign, color: 'text-success', bg: 'bg-success/10', prefix: 'KES ', format: true },
  { key: 'riskAlerts', label: 'Risk Alerts', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', alert: true },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpiConfig.map((kpi) => {
        const value = summary[kpi.key as keyof ExecutiveSummary] as number;
        const Icon = kpi.icon;
        return (
          <Card
            key={kpi.key}
            className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
              kpi.alert && value > 0 ? 'ring-1 ring-destructive' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground truncate">{kpi.label}</span>
                <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                </div>
              </div>
              <p className={`text-xl font-bold tracking-tight ${kpi.alert && value > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {formatNumber(value, (kpi as any).format, (kpi as any).prefix, (kpi as any).suffix)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
