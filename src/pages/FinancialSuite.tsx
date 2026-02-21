import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Receipt, Landmark, TrendingUp } from "lucide-react";
import { BudgetPlanning } from "@/components/financial/BudgetPlanning";
import { ExpenseTracking } from "@/components/financial/ExpenseTracking";
import { GrantManagement } from "@/components/financial/GrantManagement";
import { CostAnalytics } from "@/components/financial/CostAnalytics";

export default function FinancialSuite() {
  const [activeTab, setActiveTab] = useState("budgets");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Financial Suite</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Budget planning, expense tracking, grant management & cost analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1 bg-muted/50 p-1 rounded-xl">
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
          <TabsTrigger value="cost-analytics" className="flex items-center gap-2 text-xs md:text-sm py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Cost Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="budgets" className="mt-6">
          <BudgetPlanning />
        </TabsContent>
        <TabsContent value="expenses" className="mt-6">
          <ExpenseTracking />
        </TabsContent>
        <TabsContent value="grants" className="mt-6">
          <GrantManagement />
        </TabsContent>
        <TabsContent value="cost-analytics" className="mt-6">
          <CostAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
