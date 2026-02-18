import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, GraduationCap, Users, Home, Target,
  Activity, Shield, Gauge, DollarSign
} from "lucide-react";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

// Analytics sections (existing)
import { AnalyticsDateFilter } from "@/components/analytics/AnalyticsDateFilter";
import { AcademicPerformanceSection } from "@/components/analytics/AcademicPerformanceSection";
import { FieldActivitySection } from "@/components/analytics/FieldActivitySection";
import { SystemIntelligenceSection } from "@/components/analytics/SystemIntelligenceSection";

// Executive components
import { ExecutiveSummaryPanel } from "@/components/executive/ExecutiveSummaryPanel";
import { StaffPerformanceIntelligence } from "@/components/executive/StaffPerformanceIntelligence";
import { ProgramProjectIntelligence } from "@/components/executive/ProgramProjectIntelligence";
import { BeneficiaryImpactIntelligence } from "@/components/executive/BeneficiaryImpactIntelligence";
import { DonorFundingIntelligence } from "@/components/executive/DonorFundingIntelligence";
import { useExecutiveAnalytics } from "@/hooks/useExecutiveAnalytics";

export default function ReportsAnalytics() {
  const [activeTab, setActiveTab] = useState("executive");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date())
  });
  const [programFilter, setProgramFilter] = useState("all");

  const {
    beneficiaries, programs, enrollments, visitations,
    academicRecords, uploads,
    staffMetrics, executiveSummary, monthlyStaffTrends, hrAlerts,
    programIntelligence, beneficiaryImpact, donorIntelligence,
    isLoading,
  } = useExecutiveAnalytics(dateRange, programFilter);

  const tabs = [
    { id: 'executive', label: 'Executive Summary', icon: Gauge },
    { id: 'staff', label: 'Staff & HR Intelligence', icon: Activity },
    { id: 'programs', label: 'Program Intelligence', icon: Target },
    { id: 'lifecycle', label: 'Beneficiary Impact', icon: Users },
    { id: 'donors', label: 'Donor & Funding', icon: DollarSign },
    { id: 'field', label: 'Visitations', icon: Home },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'system', label: 'Data Quality', icon: Shield },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeroHeader
        icon={BarChart3}
        title="Executive Analytics Dashboard"
        description="Centralized intelligence for organizational performance, HR insights, and program monitoring"
      />

      {/* Executive Summary KPIs */}
      <ExecutiveSummaryPanel summary={executiveSummary} isLoading={isLoading} />

      {/* Filters */}
      <AnalyticsDateFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        programFilter={programFilter}
        onProgramFilterChange={setProgramFilter}
        programs={programs}
      />

      {/* Section Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto md:flex-wrap h-auto gap-1 p-1 bg-muted/50">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-1.5 whitespace-nowrap text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="executive">
          <StaffPerformanceIntelligence
            staffMetrics={staffMetrics}
            monthlyTrends={monthlyStaffTrends}
            hrAlerts={hrAlerts}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="staff">
          <StaffPerformanceIntelligence
            staffMetrics={staffMetrics}
            monthlyTrends={monthlyStaffTrends}
            hrAlerts={hrAlerts}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="programs">
          <ProgramProjectIntelligence
            data={programIntelligence}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="lifecycle">
          <BeneficiaryImpactIntelligence
            data={beneficiaryImpact}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="donors">
          <DonorFundingIntelligence
            data={donorIntelligence}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="field">
          <FieldActivitySection 
            visitations={visitations}
            beneficiaries={beneficiaries}
            dateRange={dateRange}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="academic">
          <AcademicPerformanceSection 
            academicRecords={academicRecords}
            beneficiaries={beneficiaries}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="system">
          <SystemIntelligenceSection 
            beneficiaries={beneficiaries}
            enrollments={enrollments}
            programs={programs}
            reportsData={null}
            uploads={uploads}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
