import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Bell, FileBarChart } from "lucide-react";
import { WorkflowTriggers, SmartAlerts, DonorReports } from "@/components/automation";

export default function AutomationEngine() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Automation Engine</h1>
        <p className="text-muted-foreground text-sm">Workflow triggers, smart alerts & auto-generated donor reports</p>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto bg-muted/50">
            <TabsTrigger value="workflows" className="gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" /> Workflows
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5 text-xs">
              <Bell className="h-3.5 w-3.5" /> Smart Alerts
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs">
              <FileBarChart className="h-3.5 w-3.5" /> Donor Reports
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="workflows"><WorkflowTriggers /></TabsContent>
        <TabsContent value="alerts"><SmartAlerts /></TabsContent>
        <TabsContent value="reports"><DonorReports /></TabsContent>
      </Tabs>
    </div>
  );
}
