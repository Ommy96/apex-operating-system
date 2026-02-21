import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeartPulse, ShieldAlert, TrendingUp } from "lucide-react";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { AnalyticsDateFilter } from "@/components/analytics/AnalyticsDateFilter";
import { ExecutiveSummaryPanel } from "@/components/executive/ExecutiveSummaryPanel";
import { OrgHealthScore } from "@/components/executive/OrgHealthScore";
import { RiskDashboard } from "@/components/executive/RiskDashboard";
import { ForecastingEngine } from "@/components/executive/ForecastingEngine";
import { useExecutiveAnalytics } from "@/hooks/useExecutiveAnalytics";

export default function ExecutiveIntelligence() {
  const [activeTab, setActiveTab] = useState("health");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  });
  const [programFilter, setProgramFilter] = useState("all");

  const {
    programs, staffMetrics, executiveSummary, monthlyStaffTrends, hrAlerts,
    programIntelligence, beneficiaryImpact, donorIntelligence, isLoading,
  } = useExecutiveAnalytics(dateRange, programFilter);

  const tabs = [
    { id: "health", label: "Health Score", icon: HeartPulse },
    { id: "risks", label: "Risk Dashboard", icon: ShieldAlert },
    { id: "forecast", label: "Forecasting", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeroHeader
        icon={HeartPulse}
        title="Executive Intelligence"
        description="Org health score, risk monitoring, and data-driven forecasting"
      />

      <ExecutiveSummaryPanel summary={executiveSummary} isLoading={isLoading} />

      <AnalyticsDateFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        programFilter={programFilter}
        onProgramFilterChange={setProgramFilter}
        programs={programs}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-flex h-auto gap-1 p-1 bg-muted/50">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="health">
          <OrgHealthScore
            summary={executiveSummary}
            staffMetrics={staffMetrics}
            beneficiaryImpact={beneficiaryImpact}
            donorIntelligence={donorIntelligence}
            programIntelligence={programIntelligence}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="risks">
          <RiskDashboard
            summary={executiveSummary}
            staffMetrics={staffMetrics}
            hrAlerts={hrAlerts}
            beneficiaryImpact={beneficiaryImpact}
            donorIntelligence={donorIntelligence}
            programIntelligence={programIntelligence}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="forecast">
          <ForecastingEngine
            programIntelligence={programIntelligence}
            donorIntelligence={donorIntelligence}
            monthlyStaffTrends={monthlyStaffTrends}
            summary={executiveSummary}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
