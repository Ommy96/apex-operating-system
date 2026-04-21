import { useState, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  LayoutDashboard,
  Users,
  Target,
  DollarSign,
  Home,
  ShieldAlert,
  PieChart,
  TrendingUp,
  Database,
  RefreshCw,
} from "lucide-react";

import { PageHeroHeader } from "@/components/PageHeroHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { PrivacyBanner } from "@/components/analytics/PrivacyBanner";
import { AnalyticsGlobalFilterBar } from "@/components/analytics/AnalyticsGlobalFilterBar";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useExecutiveAnalytics } from "@/hooks/useExecutiveAnalytics";

// === Lazy-loaded tab content ===
// Each tab is split into its own chunk so the page does not eagerly fetch all
// nine tabs' worth of analytics on first paint.
const OverviewTab = lazy(() => import("@/components/analytics/tabs/OverviewTab"));
const BeneficiaryTab = lazy(() => import("@/components/analytics/tabs/BeneficiaryTab"));
const ProgrammeTab = lazy(() => import("@/components/analytics/tabs/ProgrammeTab"));
const FundingTab = lazy(() => import("@/components/analytics/tabs/FundingTab"));

// Existing intelligence panels are reused as interim tab content until each
// is rebuilt against the new global filter bar in subsequent phases.
const FieldActivitySection = lazy(() =>
  import("@/components/analytics/FieldActivitySection").then((m) => ({
    default: m.FieldActivitySection,
  }))
);
const RiskDashboard = lazy(() =>
  import("@/components/executive/RiskDashboard").then((m) => ({
    default: m.RiskDashboard,
  }))
);
const DataAnalysisSection = lazy(() =>
  import("@/components/analytics/DataAnalysisSection").then((m) => ({
    default: m.DataAnalysisSection,
  }))
);
const ForecastingEngine = lazy(() =>
  import("@/components/executive/ForecastingEngine").then((m) => ({
    default: m.ForecastingEngine,
  }))
);
const SystemIntelligenceSection = lazy(() =>
  import("@/components/analytics/SystemIntelligenceSection").then((m) => ({
    default: m.SystemIntelligenceSection,
  }))
);

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "beneficiary", label: "Beneficiary intel", icon: Users },
  { id: "programme", label: "Programme & project", icon: Target },
  { id: "funding", label: "Funding intel", icon: DollarSign },
  { id: "visitation", label: "Visitations", icon: Home },
  { id: "risk", label: "Risk dashboard", icon: ShieldAlert },
  { id: "demographics", label: "Demographics", icon: PieChart },
  { id: "forecast", label: "Forecasting", icon: TrendingUp },
  { id: "quality", label: "Data quality", icon: Database },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ReportsAnalytics() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const {
    filters,
    setDateRange,
    setCounty,
    setProgramId,
    setGender,
    setAgeBucket,
    reset,
  } = useAnalyticsFilters();

  // Programmes list — small, shared across the filter bar and several tabs.
  const { data: programmes = [] } = useQuery({
    queryKey: ["analytics-programmes", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("programs")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  // Legacy executive analytics still powers tabs 2-8 until each is rebuilt.
  const exec = useExecutiveAnalytics(filters.dateRange, filters.programId);

  const lastUpdatedLabel = useMemo(
    () =>
      new Date().toLocaleTimeString("en-KE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [activeTab, filters]
  );

  return (
    <div className="space-y-5 pb-10">
      <PageHeroHeader
        icon={BarChart3}
        title="Analytics & Reporting Center"
        description="Aggregated intelligence across beneficiaries, programmes, funding, visitations and data quality"
      />

      <PrivacyBanner />

      <AnalyticsGlobalFilterBar
        filters={filters}
        programs={programmes}
        onDateRangeChange={setDateRange}
        onCountyChange={setCounty}
        onProgramChange={setProgramId}
        onGenderChange={setGender}
        onAgeBucketChange={setAgeBucket}
        onReset={reset}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Last updated · {lastUpdatedLabel}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.reload()}
          className="h-7 gap-1.5 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 no-scrollbar">
          <TabsList className="inline-flex h-auto w-max gap-1 bg-muted/40 p-1 md:w-auto md:flex-wrap">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-1.5 whitespace-nowrap text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <OverviewTab filters={filters} />
          </Suspense>
        </TabsContent>

        <TabsContent value="beneficiary" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <BeneficiaryTab filters={filters} />
          </Suspense>
        </TabsContent>

        <TabsContent value="programme" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <ProgrammeTab filters={filters} />
          </Suspense>
        </TabsContent>

        <TabsContent value="funding" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <FundingTab filters={filters} />
          </Suspense>
        </TabsContent>

        <TabsContent value="visitation" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <FieldActivitySection
              visitations={exec.visitations}
              beneficiaries={exec.beneficiaries}
              dateRange={filters.dateRange}
              isLoading={exec.isLoading}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="risk" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <RiskDashboard
              summary={exec.executiveSummary}
              staffMetrics={exec.staffMetrics}
              hrAlerts={exec.hrAlerts}
              beneficiaryImpact={exec.beneficiaryImpact}
              donorIntelligence={exec.donorIntelligence}
              programIntelligence={exec.programIntelligence}
              isLoading={exec.isLoading}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="demographics" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <DataAnalysisSection
              beneficiaries={exec.beneficiaries}
              donors={exec.donors}
              isLoading={exec.isLoading}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="forecast" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <ForecastingEngine
              programIntelligence={exec.programIntelligence}
              donorIntelligence={exec.donorIntelligence}
              monthlyStaffTrends={exec.monthlyStaffTrends}
              summary={exec.executiveSummary}
              isLoading={exec.isLoading}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <Suspense fallback={<TabSkeleton />}>
            <SystemIntelligenceSection
              beneficiaries={exec.beneficiaries}
              enrollments={exec.enrollments}
              programs={exec.programs}
              reportsData={null}
              uploads={exec.uploads}
              isLoading={exec.isLoading}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[260px] w-full" />
        ))}
      </div>
    </div>
  );
}
