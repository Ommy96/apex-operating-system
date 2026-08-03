import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRiskAssessment, RiskItem, RiskSeverity } from "@/hooks/useRiskAssessment";
import { useOrgRiskSummary } from "@/hooks/useBeneficiaryRisk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ShieldAlert, AlertTriangle, Users, DollarSign,
  ArrowRight, ShieldCheck, Activity, Filter, ExternalLink,
} from "lucide-react";
import { PageHeroHeader } from "@/components/PageHeroHeader";

const severityConfig: Record<RiskSeverity, { color: string; bg: string; border: string }> = {
  critical: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
  high: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
  medium: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  low: { color: "text-success", bg: "bg-success/10", border: "border-success/20" },
};

const categoryIcons: Record<string, typeof DollarSign> = {
  financial: DollarSign,
  programme: Activity,
  compliance: ShieldAlert,
  data_quality: Users,
};

export default function RiskIntelligence() {
  const navigate = useNavigate();
  const { data: risks = [], isLoading: risksLoading } = useRiskAssessment();
  const { data: beneficiaryRisk, isLoading: bRiskLoading } = useOrgRiskSummary();
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const isLoading = risksLoading || bRiskLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeroHeader title="Risk Intelligence" description="Automated risk detection across finances, programmes, compliance, and data" icon={ShieldAlert} iconColorClass="text-destructive" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const counts: Record<RiskSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  risks.forEach(r => counts[r.severity]++);
  // Add beneficiary risks
  counts.high += beneficiaryRisk?.highRisk || 0;
  counts.medium += beneficiaryRisk?.mediumRisk || 0;
  counts.low += beneficiaryRisk?.lowRisk || 0;
  const total = counts.critical + counts.high + counts.medium + counts.low;

  const filteredRisks = severityFilter === "all" ? risks : risks.filter(r => r.severity === severityFilter);

  return (
    <div className="space-y-6">
      <PageHeroHeader title="Risk Intelligence" description="Automated risk detection across finances, programmes, compliance, and data" icon={ShieldAlert} iconColorClass="text-destructive" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Critical", count: counts.critical, icon: AlertTriangle, color: "destructive" },
          { label: "High", count: counts.high, icon: ShieldAlert, color: "destructive" },
          { label: "Medium", count: counts.medium, icon: ShieldAlert, color: "warning" },
          { label: "Low", count: counts.low, icon: ShieldCheck, color: "success" },
        ].map(s => (
          <Card key={s.label} className={`border-${s.color}/20`}>
            <CardContent className="p-4 text-center">
              <s.icon className={`h-6 w-6 text-${s.color} mx-auto mb-2`} />
              <p className={`text-xl sm:text-3xl font-bold text-${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribution Bar */}
      {total > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-4 rounded-full overflow-hidden bg-muted">
              {counts.critical > 0 && <div className="bg-destructive" style={{ width: `${(counts.critical / total) * 100}%` }} />}
              {counts.high > 0 && <div className="bg-destructive/70" style={{ width: `${(counts.high / total) * 100}%` }} />}
              {counts.medium > 0 && <div className="bg-warning" style={{ width: `${(counts.medium / total) * 100}%` }} />}
              {counts.low > 0 && <div className="bg-success" style={{ width: `${(counts.low / total) * 100}%` }} />}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive" />Critical ({counts.critical})</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive/70" />High ({counts.high})</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-warning" />Medium ({counts.medium})</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-success" />Low ({counts.low})</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter + Risk Items */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Detected Risks ({filteredRisks.length})</h3>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredRisks.length === 0 ? (
        <Card className="workspace-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No risks detected at this severity level</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredRisks.map(risk => {
            const cfg = severityConfig[risk.severity];
            const Icon = categoryIcons[risk.category] || ShieldAlert;
            return (
              <Card key={risk.id} className={`${cfg.border} border`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className={`text-[10px] ${cfg.color} ${cfg.bg} ${cfg.border}`}>{risk.severity}</Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{risk.category.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-sm text-foreground">{risk.description}</p>
                    <p className="text-xs text-muted-foreground">{risk.entityName}</p>
                  </div>
                  {risk.link && (
                    <Button variant="ghost" size="sm" onClick={() => navigate(risk.link!)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Beneficiary Risk Section */}
      {(beneficiaryRisk?.topRisks?.length || 0) > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />At-Risk Beneficiaries</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/beneficiaries")}>View All<ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {beneficiaryRisk!.topRisks.slice(0, 5).map(b => (
                <button key={b.id} onClick={() => navigate(`/beneficiaries/${b.id}`)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/80 transition-colors text-left">
                  <Avatar className="h-9 w-9 border border-border shrink-0">
                    {b.photo_url ? <AvatarImage src={b.photo_url} /> : null}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{b.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.display_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{b.beneficiary_type}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-foreground">{b.riskScore}</span>
                    <Badge className={`text-[10px] ${severityConfig[b.riskLevel as RiskSeverity]?.bg} ${severityConfig[b.riskLevel as RiskSeverity]?.color} ${severityConfig[b.riskLevel as RiskSeverity]?.border}`}>
                      {b.riskLevel}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
