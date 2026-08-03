import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingDown, TrendingUp, Activity, Shield } from "lucide-react";
import { useME } from "@/hooks/useME";

const RISK_COLORS: Record<string, string> = {
  low: "bg-success/10 text-success border-success/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-warning/10 text-warning border-warning/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

export function RiskTracking() {
  const { riskScores, progressLogs } = useME();
  const scores = riskScores.data || [];

  const riskSummary = {
    low: scores.filter((s: any) => s.overall_risk_level === "low").length,
    medium: scores.filter((s: any) => s.overall_risk_level === "medium").length,
    high: scores.filter((s: any) => s.overall_risk_level === "high").length,
    critical: scores.filter((s: any) => s.overall_risk_level === "critical").length,
  };

  const total = scores.length || 1;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Beneficiary Risk Tracking</h2>
        <p className="text-sm text-muted-foreground">Monitor vulnerability, dropout risk & engagement scores</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {(["low", "medium", "high", "critical"] as const).map(level => (
          <Card key={level} className={`${RISK_COLORS[level]} border`}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{riskSummary[level]}</p>
              <p className="text-xs font-medium capitalize">{level} Risk</p>
              <Progress value={(riskSummary[level] / total) * 100} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Recent Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {riskScores.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {scores.length === 0 && !riskScores.isLoading && (
            <div className="text-center py-8">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No risk assessments recorded yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Risk scores can be created from beneficiary profiles.</p>
            </div>
          )}

          <div className="space-y-2">
            {scores.slice(0, 20).map((score: any) => (
              <div key={score.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {score.beneficiaries?.display_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(score.assessment_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="text-center">
                    <p className="text-muted-foreground">Vulnerability</p>
                    <p className="font-semibold">{score.vulnerability_index ?? "-"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Dropout</p>
                    <p className="font-semibold flex items-center gap-0.5">
                      {(score.dropout_risk_score ?? 0) > 60 ? <TrendingDown className="h-3 w-3 text-destructive" /> : <TrendingUp className="h-3 w-3 text-success" />}
                      {score.dropout_risk_score ?? "-"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Engagement</p>
                    <p className="font-semibold">{score.engagement_score ?? "-"}</p>
                  </div>
                  <Badge variant="outline" className={RISK_COLORS[score.overall_risk_level]}>{score.overall_risk_level}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Progress Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Recent Progress Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progressLogs.data?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No progress logs recorded yet.</p>
          )}
          <div className="space-y-2">
            {progressLogs.data?.slice(0, 10).map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                <Badge variant="outline" className="text-[10px] capitalize">{log.category}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{log.title}</p>
                  <p className="text-xs text-muted-foreground">{log.beneficiaries?.display_name} · {new Date(log.log_date).toLocaleDateString()}</p>
                </div>
                {log.progress_value != null && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {log.previous_value != null && <>{log.previous_value} → </>}{log.progress_value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
