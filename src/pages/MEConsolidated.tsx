import { lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const MEHub = lazy(() => import("./MEHub"));
const IndicatorManagement = lazy(() => import("./IndicatorManagement"));
const MECalendar = lazy(() => import("./MECalendar"));
const FormBuilderList = lazy(() => import("./FormBuilderList"));
const CaseManagement = lazy(() => import("./CaseManagement"));
const ReportAssembly = lazy(() => import("./ReportAssembly"));

const VALID_TABS = [
  "overview",
  "indicators",
  "data-collection",
  "forms",
  "cases",
  "reports",
] as const;
type TabKey = typeof VALID_TABS[number];

function TabFallback() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function MEConsolidated() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const active: TabKey = useMemo(
    () => (VALID_TABS.includes(raw as TabKey) ? (raw as TabKey) : "overview"),
    [raw]
  );

  const onChange = (val: string) => {
    const next = new URLSearchParams(params);
    if (val === "overview") next.delete("tab");
    else next.set("tab", val);
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="px-6 pt-5 pb-0">
          <h1 className="text-2xl font-semibold tracking-tight mb-3">
            Monitoring &amp; Evaluation
          </h1>
          <Tabs value={active} onValueChange={onChange}>
            <TabsList className="bg-transparent p-0 h-auto gap-1 border-b-0">
              <TabsTrigger value="overview" className="rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-2">
                Overview
              </TabsTrigger>
              <TabsTrigger value="indicators" className="rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-2">
                Indicators
              </TabsTrigger>
              <TabsTrigger value="data-collection" className="rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-2">
                Data Collection
              </TabsTrigger>
              <TabsTrigger value="forms" className="rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-2">
                Forms
              </TabsTrigger>
              <TabsTrigger value="cases" className="rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-2">
                Cases
              </TabsTrigger>
              <TabsTrigger value="reports" className="rounded-b-none data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary px-4 py-2">
                Reports
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<TabFallback />}>
          {active === "overview" && <MEHub />}
          {active === "indicators" && <IndicatorManagement />}
          {active === "data-collection" && <MECalendar />}
          {active === "forms" && <FormBuilderList />}
          {active === "cases" && <CaseManagement />}
          {active === "reports" && <ReportAssembly />}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}