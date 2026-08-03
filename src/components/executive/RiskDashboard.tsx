import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ShieldAlert, Users, TrendingDown, DollarSign, Clock } from "lucide-react";
import { ExecutiveSummary } from "@/hooks/useExecutiveAnalytics";

interface RiskDashboardProps {
  summary: ExecutiveSummary;
  staffMetrics: any[];
  hrAlerts: { type: string; title: string; description: string }[];
  beneficiaryImpact: any;
  donorIntelligence: any;
  programIntelligence: any;
  isLoading: boolean;
}

interface RiskItem {
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
}

const severityConfig = {
  critical: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", badge: "bg-destructive/10 text-destructive" },
  high: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", badge: "bg-warning/10 text-warning" },
  medium: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", badge: "bg-warning/10 text-warning" },
  low: { color: "text-info", bg: "bg-info/10", border: "border-info/30", badge: "bg-info/10 text-info" },
};

function computeRisks(
  summary: ExecutiveSummary,
  staffMetrics: any[],
  hrAlerts: any[],
  beneficiaryImpact: any,
  donorIntelligence: any,
  programIntelligence: any
): RiskItem[] {
  const risks: RiskItem[] = [];

  // Donor concentration risk
  const topShare = donorIntelligence?.topDonorShare || 0;
  if (topShare > 70) {
    risks.push({ severity: "critical", category: "Financial", title: "Extreme Donor Concentration", description: `Top donor accounts for ${topShare}% of total funding. Loss would be catastrophic.`, icon: DollarSign });
  } else if (topShare > 50) {
    risks.push({ severity: "high", category: "Financial", title: "High Donor Concentration", description: `Top donor accounts for ${topShare}% of funding. Diversification needed.`, icon: DollarSign });
  }

  // Funding decline
  const growth = donorIntelligence?.fundingGrowth || 0;
  if (growth < -30) {
    risks.push({ severity: "critical", category: "Financial", title: "Funding Decline", description: `Funding dropped ${Math.abs(growth)}% vs previous quarter.`, icon: TrendingDown });
  } else if (growth < -10) {
    risks.push({ severity: "medium", category: "Financial", title: "Funding Slowdown", description: `Funding decreased ${Math.abs(growth)}% vs previous quarter.`, icon: TrendingDown });
  }

  // Beneficiary overdue visits
  const overdue = beneficiaryImpact?.overdue90 || 0;
  const total = summary.totalActiveBeneficiaries || 1;
  const overdueRate = Math.round((overdue / total) * 100);
  if (overdueRate > 50) {
    risks.push({ severity: "critical", category: "Service Delivery", title: "Mass Visit Overdue", description: `${overdue} beneficiaries (${overdueRate}%) haven't been visited in 90+ days.`, icon: Clock });
  } else if (overdueRate > 25) {
    risks.push({ severity: "high", category: "Service Delivery", title: "Visit Coverage Gap", description: `${overdue} beneficiaries (${overdueRate}%) overdue for visits.`, icon: Clock });
  } else if (overdue > 0) {
    risks.push({ severity: "medium", category: "Service Delivery", title: "Some Visits Overdue", description: `${overdue} beneficiaries need follow-up visits.`, icon: Clock });
  }

  // Follow-up completion
  const followUpRate = beneficiaryImpact?.followUpCompletionRate || 100;
  if (followUpRate < 50) {
    risks.push({ severity: "high", category: "Compliance", title: "Low Follow-Up Rate", description: `Only ${followUpRate}% of required follow-ups have been completed.`, icon: ShieldAlert });
  } else if (followUpRate < 75) {
    risks.push({ severity: "medium", category: "Compliance", title: "Follow-Up Backlog", description: `${followUpRate}% follow-up completion rate — below 75% target.`, icon: ShieldAlert });
  }

  // Overloaded / low-performing staff
  const overloaded = staffMetrics.filter(s => s.workloadLevel === "overloaded").length;
  const lowPerf = staffMetrics.filter(s => s.performanceScore < 30).length;
  if (overloaded > 0) {
    risks.push({ severity: "high", category: "HR", title: "Staff Overload", description: `${overloaded} staff member(s) are overloaded and at risk of burnout.`, icon: Users });
  }
  if (lowPerf > 0) {
    risks.push({ severity: "medium", category: "HR", title: "Low Performance", description: `${lowPerf} staff member(s) scoring below 30/100.`, icon: Users });
  }

  // Data quality
  const missingDOB = beneficiaryImpact?.missingDOB || 0;
  const missingLoc = beneficiaryImpact?.missingLocation || 0;
  const dataGaps = missingDOB + missingLoc;
  if (dataGaps > total * 0.3) {
    risks.push({ severity: "medium", category: "Data Quality", title: "Incomplete Records", description: `${dataGaps} data gaps: ${missingDOB} missing DOB, ${missingLoc} missing location.`, icon: AlertTriangle });
  }

  // No risks
  if (risks.length === 0) {
    risks.push({ severity: "low", category: "Overall", title: "No Major Risks Detected", description: "All systems are operating within acceptable parameters.", icon: ShieldAlert });
  }

  return risks.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });
}

export function RiskDashboard({ summary, staffMetrics, hrAlerts, beneficiaryImpact, donorIntelligence, programIntelligence, isLoading }: RiskDashboardProps) {
  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  }

  const risks = computeRisks(summary, staffMetrics, hrAlerts, beneficiaryImpact, donorIntelligence, programIntelligence);

  const countBySeverity = {
    critical: risks.filter(r => r.severity === "critical").length,
    high: risks.filter(r => r.severity === "high").length,
    medium: risks.filter(r => r.severity === "medium").length,
    low: risks.filter(r => r.severity === "low").length,
  };

  return (
    <div className="space-y-4">
      {/* Severity Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
        {(["critical", "high", "medium", "low"] as const).map((sev) => {
          const cfg = severityConfig[sev];
          return (
            <Card key={sev} className={`border ${cfg.border} shadow-sm`}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${cfg.color}`}>{countBySeverity[sev]}</p>
                <p className="text-xs font-medium text-muted-foreground capitalize">{sev}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Risk Items */}
      <div className="space-y-2">
        {risks.map((risk, i) => {
          const cfg = severityConfig[risk.severity];
          const Icon = risk.icon;
          return (
            <Card key={i} className={`border-0 shadow-sm`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`p-2 rounded-lg ${cfg.bg} shrink-0`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-foreground">{risk.title}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.badge}`}>
                      {risk.severity}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {risk.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{risk.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
