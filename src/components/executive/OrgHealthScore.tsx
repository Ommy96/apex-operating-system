import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HeartPulse, Users, Target, Activity, DollarSign, Shield } from "lucide-react";
import { ExecutiveSummary } from "@/hooks/useExecutiveAnalytics";

interface OrgHealthScoreProps {
  summary: ExecutiveSummary;
  staffMetrics: any[];
  beneficiaryImpact: any;
  donorIntelligence: any;
  programIntelligence: any;
  isLoading: boolean;
}

interface HealthDimension {
  label: string;
  score: number;
  icon: React.ComponentType<any>;
  detail: string;
}

function computeHealthDimensions(
  summary: ExecutiveSummary,
  staffMetrics: any[],
  beneficiaryImpact: any,
  donorIntelligence: any,
  programIntelligence: any
): HealthDimension[] {
  // 1. Beneficiary Health (0-100)
  const visitCoverage = beneficiaryImpact?.visitCoverageRate || 0;
  const followUpRate = beneficiaryImpact?.followUpCompletionRate || 0;
  const overdueRatio = summary.totalActiveBeneficiaries > 0
    ? Math.max(0, 100 - ((beneficiaryImpact?.overdue90 || 0) / summary.totalActiveBeneficiaries) * 100)
    : 100;
  const beneficiaryScore = Math.round((visitCoverage * 0.4 + followUpRate * 0.3 + overdueRatio * 0.3));

  // 2. Staff Performance (0-100)
  const staffScore = summary.avgStaffPerformance || 0;

  // 3. Program Coverage (0-100)
  const activePrograms = summary.totalPrograms;
  const totalEnrolled = programIntelligence?.programCoverage?.reduce((s: number, p: any) => s + p.activeEnrolled, 0) || 0;
  const coverageRatio = summary.totalActiveBeneficiaries > 0
    ? Math.min(100, Math.round((totalEnrolled / summary.totalActiveBeneficiaries) * 100))
    : 0;
  const programScore = Math.round(
    (activePrograms > 0 ? 40 : 0) +
    (coverageRatio * 0.6)
  );

  // 4. Financial Health (0-100)
  const donorDiversity = donorIntelligence?.uniqueDonors || 0;
  const topDonorShare = donorIntelligence?.topDonorShare || 0;
  const diversityScore = Math.min(100, donorDiversity * 15);
  const concentrationPenalty = topDonorShare > 50 ? (topDonorShare - 50) : 0;
  const fundingGrowth = donorIntelligence?.fundingGrowth || 0;
  const growthBonus = Math.min(20, Math.max(0, fundingGrowth * 0.2));
  const financialScore = Math.round(Math.min(100, Math.max(0, diversityScore - concentrationPenalty + growthBonus)));

  // 5. Data Quality (0-100)
  const missingDOB = beneficiaryImpact?.missingDOB || 0;
  const missingLoc = beneficiaryImpact?.missingLocation || 0;
  const total = summary.totalActiveBeneficiaries || 1;
  const completeness = Math.max(0, 100 - ((missingDOB + missingLoc) / (total * 2)) * 100);
  const dataScore = Math.round(completeness);

  // 6. Risk Posture (0-100) — lower risk = higher score
  const riskScore = Math.max(0, 100 - (summary.riskAlerts * 10));

  return [
    { label: "Beneficiary Care", score: beneficiaryScore, icon: Users, detail: `${visitCoverage}% visit coverage, ${followUpRate}% follow-up rate` },
    { label: "Staff Performance", score: staffScore, icon: Activity, detail: `${staffMetrics.length} active staff, avg ${staffScore}/100` },
    { label: "Program Reach", score: programScore, icon: Target, detail: `${activePrograms} programs, ${coverageRatio}% enrolled` },
    { label: "Financial Health", score: financialScore, icon: DollarSign, detail: `${donorDiversity} donors, ${topDonorShare}% concentration` },
    { label: "Data Quality", score: dataScore, icon: Shield, detail: `${missingDOB} missing DOB, ${missingLoc} missing location` },
    { label: "Risk Posture", score: Math.max(0, riskScore), icon: HeartPulse, detail: `${summary.riskAlerts} active alerts` },
  ];
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Attention";
  return "Critical";
}

export function OrgHealthScore({ summary, staffMetrics, beneficiaryImpact, donorIntelligence, programIntelligence, isLoading }: OrgHealthScoreProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const dimensions = computeHealthDimensions(summary, staffMetrics, beneficiaryImpact, donorIntelligence, programIntelligence);
  const overallScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative flex items-center justify-center">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-muted" />
                <circle
                  cx="60" cy="60" r="52" fill="none" strokeWidth="10"
                  strokeDasharray={`${(overallScore / 100) * 327} 327`}
                  strokeLinecap="round"
                  className={overallScore >= 80 ? "stroke-emerald-500" : overallScore >= 60 ? "stroke-amber-500" : "stroke-red-500"}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</span>
                <span className="text-[10px] text-muted-foreground font-medium">/ 100</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground">Organization Health Score</h3>
              <Badge variant="outline" className={`mt-1 ${getScoreColor(overallScore)}`}>
                {getScoreLabel(overallScore)}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Composite score across {dimensions.length} key dimensions of organizational performance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {dimensions.map((dim) => {
          const Icon = dim.icon;
          return (
            <Card key={dim.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${getScoreColor(dim.score)}`} />
                    <span className="text-sm font-medium text-foreground">{dim.label}</span>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(dim.score)}`}>{dim.score}</span>
                </div>
                <Progress value={dim.score} className={`h-1.5 [&>div]:${getScoreBg(dim.score)}`} />
                <p className="text-xs text-muted-foreground mt-2">{dim.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
