import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle, TrendingDown, Users, DollarSign, Sparkles, RefreshCw,
  ArrowRight, ShieldAlert, Heart, BookOpen, HandHeart, Brain, UserCheck,
  Info, Target, Loader2
} from 'lucide-react';
import { useAIInsights, BeneficiaryRisk, FundingGap, DonorOpportunity } from '@/hooks/useAIInsights';
import { useNavigate } from 'react-router-dom';

const riskColors = { high: 'text-destructive', medium: 'text-orange-500', low: 'text-green-600' };
const riskBg = { high: 'bg-destructive/10 border-destructive/30', medium: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800', low: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' };
const severityColors = { critical: 'text-destructive', warning: 'text-orange-500', healthy: 'text-green-600' };
const severityBg = { critical: 'bg-destructive/10 border-destructive/30', warning: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800', healthy: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' };

const interventionIcons: Record<string, any> = {
  academic_support: BookOpen, counseling: Brain, financial_support: DollarSign,
  health_support: Heart, mentorship: UserCheck, family_support: HandHeart,
};

function RiskLevelBadge({ level }: { level: string }) {
  return (
    <Badge variant="outline" className={`${riskBg[level as keyof typeof riskBg]} ${riskColors[level as keyof typeof riskColors]} text-xs font-semibold uppercase`}>
      {level}
    </Badge>
  );
}

function BeneficiaryRiskCard({ risk }: { risk: BeneficiaryRisk }) {
  const navigate = useNavigate();
  const Icon = interventionIcons[risk.suggestedIntervention] || ShieldAlert;

  return (
    <div className={`p-4 rounded-xl border ${riskBg[risk.riskLevel]} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${risk.riskLevel === 'high' ? 'bg-destructive/20' : risk.riskLevel === 'medium' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
            <Icon className={`h-5 w-5 ${riskColors[risk.riskLevel]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm text-foreground truncate">{risk.beneficiaryName}</h4>
              <RiskLevelBadge level={risk.riskLevel} />
            </div>
            <p className="text-xs text-muted-foreground mb-2">{risk.interventionReason}</p>
            <div className="flex flex-wrap gap-1">
              {risk.riskFactors.slice(0, 3).map((f, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{f}</Badge>
              ))}
            </div>
            {risk.location && <p className="text-[10px] text-muted-foreground mt-1">📍 {risk.location}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="text-right">
                  <span className={`text-lg font-bold ${riskColors[risk.riskLevel]}`}>{risk.riskScore}</span>
                  <span className="text-[10px] text-muted-foreground block">risk score</span>
                </div>
              </TooltipTrigger>
              <TooltipContent><p>AI-calculated risk score (0-100). Higher = more urgent.</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(`/beneficiaries/${risk.beneficiaryId}`)}>
            View <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FundingGapCard({ gap }: { gap: FundingGap }) {
  const navigate = useNavigate();
  const utilization = gap.utilizationPercent || (gap.totalBudget > 0 ? (gap.totalSpent || 0) / gap.totalBudget * 100 : 0);

  return (
    <div className={`p-4 rounded-xl border ${severityBg[gap.severity]} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-sm text-foreground">{gap.programName}</h4>
            <Badge variant="outline" className={`${severityColors[gap.severity]} text-[10px] uppercase`}>{gap.severity}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Budget</p>
              <p className="text-sm font-semibold">${(gap.totalBudget || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Funded</p>
              <p className="text-sm font-semibold">${(gap.totalFunding || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground text-destructive">Gap</p>
              <p className="text-sm font-bold text-destructive">${(gap.fundingGap || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">Utilization</span>
              <span className="font-medium">{Math.round(utilization)}%</span>
            </div>
            <Progress value={Math.min(utilization, 100)} className="h-1.5" />
          </div>
          <p className="text-xs text-muted-foreground">{gap.recommendation}</p>
          {gap.suggestedDonors && gap.suggestedDonors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[10px] text-muted-foreground">Suggested:</span>
              {gap.suggestedDonors.map((d, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{d}</Badge>
              ))}
            </div>
          )}
        </div>
        {gap.beneficiariesImpacted && (
          <div className="text-right">
            <span className="text-lg font-bold text-foreground">{gap.beneficiariesImpacted}</span>
            <span className="text-[10px] text-muted-foreground block">impacted</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DonorOpportunityCard({ opp }: { opp: DonorOpportunity }) {
  return (
    <div className={`p-4 rounded-xl border ${riskBg[opp.priorityLevel === 'high' ? 'high' : opp.priorityLevel === 'medium' ? 'medium' : 'low']} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm text-foreground">{opp.donorName}</h4>
            <Badge variant="outline" className="text-[10px] uppercase">{opp.priorityLevel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            <Target className="inline h-3 w-3 mr-1" />
            {opp.programName}
          </p>
          <p className="text-xs text-muted-foreground">{opp.rationale}</p>
          <div className="flex items-center gap-4 mt-3">
            {opp.potentialAmount && (
              <div>
                <p className="text-[10px] text-muted-foreground">Potential</p>
                <p className="text-sm font-semibold text-green-600">${opp.potentialAmount.toLocaleString()}</p>
              </div>
            )}
            {opp.historicalContribution != null && (
              <div>
                <p className="text-[10px] text-muted-foreground">History</p>
                <p className="text-sm font-medium">${opp.historicalContribution.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex flex-col items-center">
                <div className="relative h-12 w-12">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="3"
                      strokeDasharray={`${opp.matchScore}, 100`}
                      className={opp.matchScore >= 70 ? 'text-green-500' : opp.matchScore >= 40 ? 'text-orange-500' : 'text-destructive'}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{opp.matchScore}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">match</span>
              </div>
            </TooltipTrigger>
            <TooltipContent><p>AI match score based on donor history and program alignment</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export default function SmartInsightsDashboard() {
  const { data, isLoading, generateInsights } = useAIInsights();
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const filteredRisks = data?.beneficiaryRisks?.filter(r => riskFilter === 'all' || r.riskLevel === riskFilter) || [];
  const highRisks = data?.beneficiaryRisks?.filter(r => r.riskLevel === 'high').length || 0;
  const criticalGaps = data?.fundingGaps?.filter(g => g.severity === 'critical').length || 0;
  const highOpps = data?.donorOpportunities?.filter(o => o.priorityLevel === 'high').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">AI Smart Recommendations</h2>
            <p className="text-xs text-muted-foreground">
              {data ? `Last generated: ${new Date(data.generatedAt).toLocaleString()}` : 'Click generate to analyze your data'}
            </p>
          </div>
        </div>
        <Button onClick={() => generateInsights()} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isLoading ? 'Analyzing...' : 'Generate Insights'}
        </Button>
      </div>

      {/* Executive Summary */}
      {data?.executiveSummary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">{data.executiveSummary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-destructive/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{highRisks}</p>
                <p className="text-xs text-muted-foreground">High-Risk Beneficiaries</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-300/30">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <TrendingDown className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{criticalGaps}</p>
                <p className="text-xs text-muted-foreground">Critical Funding Gaps</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-300/30">
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                <HandHeart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{highOpps}</p>
                <p className="text-xs text-muted-foreground">High-Priority Donor Matches</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      {data && (
        <Tabs defaultValue="risks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="risks" className="gap-1.5">
              <ShieldAlert className="h-4 w-4" /> Beneficiary Risks
              {highRisks > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{highRisks}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="funding" className="gap-1.5">
              <DollarSign className="h-4 w-4" /> Funding Gaps
              {criticalGaps > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{criticalGaps}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="donors" className="gap-1.5">
              <Users className="h-4 w-4" /> Donor Opportunities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="risks" className="space-y-4">
            <div className="flex items-center justify-between">
              <CardDescription>Beneficiaries identified as needing intervention</CardDescription>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              {filteredRisks.length > 0 ? filteredRisks.map((r, i) => (
                <BeneficiaryRiskCard key={i} risk={r} />
              )) : (
                <p className="text-sm text-muted-foreground text-center py-8">No beneficiary risks found for this filter.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="funding" className="space-y-3">
            {data.fundingGaps.length > 0 ? data.fundingGaps.map((g, i) => (
              <FundingGapCard key={i} gap={g} />
            )) : (
              <p className="text-sm text-muted-foreground text-center py-8">No funding gaps identified.</p>
            )}
          </TabsContent>

          <TabsContent value="donors" className="space-y-3">
            {data.donorOpportunities.length > 0 ? data.donorOpportunities.map((o, i) => (
              <DonorOpportunityCard key={i} opp={o} />
            )) : (
              <p className="text-sm text-muted-foreground text-center py-8">No donor opportunities identified.</p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!data && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Generate AI Insights</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Analyze your organization's data to identify at-risk beneficiaries, funding gaps, and donor opportunities.
              </p>
            </div>
            <Button onClick={() => generateInsights()} size="lg" className="gap-2 mt-2">
              <Sparkles className="h-4 w-4" /> Analyze Now
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && !data && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing your organization's data with AI...</p>
            <p className="text-xs text-muted-foreground">This may take 15-30 seconds</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
