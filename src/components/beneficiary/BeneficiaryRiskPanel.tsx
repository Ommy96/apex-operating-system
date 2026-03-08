import { useBeneficiaryRisk, RiskFactor } from "@/hooks/useBeneficiaryRisk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, DollarSign, GraduationCap, Users, HeartPulse, AlertTriangle } from "lucide-react";

const categoryConfig = {
  funding: { icon: DollarSign, label: "Funding", color: "text-warning" },
  academic: { icon: GraduationCap, label: "Academic", color: "text-info" },
  participation: { icon: Users, label: "Participation", color: "text-primary" },
  welfare: { icon: HeartPulse, label: "Welfare", color: "text-destructive" },
};

const levelConfig = {
  low: { label: "Low Risk", color: "bg-success/20 text-success border-success/30", progressColor: "bg-success" },
  medium: { label: "Medium Risk", color: "bg-warning/20 text-warning border-warning/30", progressColor: "bg-warning" },
  high: { label: "High Risk", color: "bg-destructive/20 text-destructive border-destructive/30", progressColor: "bg-destructive" },
};

interface Props {
  beneficiaryId: string;
}

export function BeneficiaryRiskPanel({ beneficiaryId }: Props) {
  const { data: risk, isLoading } = useBeneficiaryRisk(beneficiaryId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!risk) return null;

  const cfg = levelConfig[risk.level];

  return (
    <div className="space-y-4">
      {/* Risk Score Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            Risk Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{risk.score}</div>
              <p className="text-xs text-muted-foreground">Risk Score</p>
            </div>
            <div className="flex-1 space-y-2">
              <Badge className={cfg.color}>{cfg.label}</Badge>
              <Progress value={risk.score} className="h-2" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Low (0-40)</span>
                <span>Medium (41-70)</span>
                <span>High (71-100)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors */}
      {risk.factors.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Risk Factors ({risk.factors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {risk.factors
              .sort((a, b) => b.points - a.points)
              .map((factor, i) => {
                const cat = categoryConfig[factor.category];
                const Icon = cat.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/30"
                  >
                    <div className={`p-1.5 rounded-md bg-background ${cat.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{factor.label}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{factor.points} pts
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{factor.detail}</p>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Suggested Interventions */}
      {risk.level !== "low" && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Suggested Interventions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-foreground">
              {risk.factors.some(f => f.category === "funding") && (
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                  Link a donor/sponsor to address funding gaps
                </li>
              )}
              {risk.factors.some(f => f.category === "academic") && (
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-info shrink-0" />
                  Schedule academic support or tutoring sessions
                </li>
              )}
              {risk.factors.some(f => f.category === "welfare") && (
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                  Schedule a welfare check / home visitation
                </li>
              )}
              {risk.factors.some(f => f.category === "participation") && (
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  Enroll in an active program or re-engage beneficiary
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
