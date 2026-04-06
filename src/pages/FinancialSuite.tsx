import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Receipt, Landmark, TrendingUp, Heart, Target, Banknote, CalendarDays } from "lucide-react";
import { BudgetPlanning } from "@/components/financial/BudgetPlanning";
import { ExpenseTracking } from "@/components/financial/ExpenseTracking";
import { GrantManagement } from "@/components/financial/GrantManagement";
import { CostAnalytics } from "@/components/financial/CostAnalytics";
import { DonorSupport } from "@/components/financial/DonorSupport";
import { SponsorshipMetrics } from "@/components/financial/SponsorshipMetrics";
import { PettyCashTab } from "@/components/finance/PettyCashTab";
import { FundingSchedulesTab } from "@/components/financial/FundingSchedulesTab";

export default function FinancialSuite() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Financial Suite</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unified financial visibility — budgets, expenses, grants, donor contributions & cost analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto h-auto gap-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="sponsorship" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Sponsorship</span>
            </TabsTrigger>
            <TabsTrigger value="budgets" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Budgets</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="grants" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Landmark className="h-4 w-4" />
              <span className="hidden sm:inline">Grants</span>
            </TabsTrigger>
            <TabsTrigger value="petty-cash" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Banknote className="h-4 w-4" />
              <span className="hidden sm:inline">Petty Cash</span>
            </TabsTrigger>
            <TabsTrigger value="cost-analytics" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Cost Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="funding-schedules" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Funding Schedules</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <SponsorshipMetrics />
          <DonorSupport />
        </TabsContent>
        <TabsContent value="sponsorship" className="mt-6">
          <SponsorshipMetrics />
        </TabsContent>
        <TabsContent value="budgets" className="mt-6">
          <BudgetPlanning />
        </TabsContent>
        <TabsContent value="expenses" className="mt-6">
          <ExpenseTracking />
        </TabsContent>
        <TabsContent value="grants" className="mt-6">
          <GrantManagement />
        </TabsContent>
        <TabsContent value="petty-cash" className="mt-6">
          <PettyCashTab />
        </TabsContent>
        <TabsContent value="cost-analytics" className="mt-6">
          <CostAnalytics />
        </TabsContent>
        <TabsContent value="funding-schedules" className="mt-6">
          <FundingSchedulesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
