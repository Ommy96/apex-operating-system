import { useNavigate } from "react-router-dom";
import { useOrgRiskSummary } from "@/hooks/useBeneficiaryRisk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert, AlertTriangle, Users, DollarSign, TrendingDown,
  ArrowRight, ShieldCheck, Activity,
} from "lucide-react";
import { PageHeroHeader } from "@/components/PageHeroHeader";

const levelColors = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  medium: "bg-warning/20 text-warning border-warning/30",
  low: "bg-success/20 text-success border-success/30",
};

export default function RiskIntelligence() {
  const navigate = useNavigate();
  const { data, isLoading } = useOrgRiskSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
      <PageHeroHeader
        title="Risk Intelligence"
        description="Predictive risk monitoring across beneficiaries, programs, and funding"
        icon={ShieldAlert}
        iconColorClass="text-destructive"
      />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const { highRisk = 0, mediumRisk = 0, lowRisk = 0, topRisks = [], fundingAtRisk = 0 } = data || {};
  const total = highRisk + mediumRisk + lowRisk;

  return (
    <div className="space-y-6">
        <PageHeroHeader
          title="Risk Intelligence"
          description="Predictive risk monitoring across beneficiaries, programs, and funding"
          icon={ShieldAlert}
          iconColorClass="text-destructive"
        />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-destructive/20">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-3xl font-bold text-destructive">{highRisk}</p>
            <p className="text-xs text-muted-foreground">High Risk</p>
          </CardContent>
        </Card>
        <Card className="border-warning/20">
          <CardContent className="p-4 text-center">
            <ShieldAlert className="h-6 w-6 text-warning mx-auto mb-2" />
            <p className="text-3xl font-bold text-warning">{mediumRisk}</p>
            <p className="text-xs text-muted-foreground">Medium Risk</p>
          </CardContent>
        </Card>
        <Card className="border-success/20">
          <CardContent className="p-4 text-center">
            <ShieldCheck className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-3xl font-bold text-success">{lowRisk}</p>
            <p className="text-xs text-muted-foreground">Low Risk</p>
          </CardContent>
        </Card>
        <Card className="border-info/20">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-info mx-auto mb-2" />
            <p className="text-3xl font-bold text-info">{fundingAtRisk}</p>
            <p className="text-xs text-muted-foreground">Unfunded</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution Bar */}
      {total > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-4 rounded-full overflow-hidden bg-muted">
              {highRisk > 0 && (
                <div
                  className="bg-destructive transition-all"
                  style={{ width: `${(highRisk / total) * 100}%` }}
                />
              )}
              {mediumRisk > 0 && (
                <div
                  className="bg-warning transition-all"
                  style={{ width: `${(mediumRisk / total) * 100}%` }}
                />
              )}
              {lowRisk > 0 && (
                <div
                  className="bg-success transition-all"
                  style={{ width: `${(lowRisk / total) * 100}%` }}
                />
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive" /> High ({highRisk})
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-warning" /> Medium ({mediumRisk})
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success" /> Low ({lowRisk})
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top At-Risk Beneficiaries */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Highest Risk Beneficiaries
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/beneficiaries")}>
              View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {topRisks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No high-risk beneficiaries detected</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topRisks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/beneficiaries/${b.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/80 transition-colors text-left"
                >
                  <Avatar className="h-9 w-9 border border-border shrink-0">
                    {b.photo_url ? <AvatarImage src={b.photo_url} /> : null}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {b.display_name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.display_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{b.beneficiary_type}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-foreground">{b.riskScore}</span>
                    <Badge className={`text-[10px] ${levelColors[b.riskLevel as keyof typeof levelColors]}`}>
                      {b.riskLevel}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Funding Risk Alerts */}
      {fundingAtRisk > 0 && (
        <Card className="border-warning/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-warning" />
              Funding Risk Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-warning">
                    {fundingAtRisk} beneficiar{fundingAtRisk === 1 ? "y" : "ies"} without any donor support
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    These individuals have no sponsors or donors linked and need immediate funding attention.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-warning/30 text-warning hover:bg-warning/10"
                    onClick={() => navigate("/beneficiaries")}
                  >
                    Review Beneficiaries
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
