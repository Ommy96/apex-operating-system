import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, MapPin, CheckSquare } from "lucide-react";
import { PerformanceContracts, LeaveManagement, FieldCheckIns, TaskManagement } from "@/components/hr";

export default function HRManagement() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR & Staff Management</h1>
        <p className="text-muted-foreground text-sm">Performance contracts, leave, GPS verification & task tracking</p>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="performance" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Performance
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Leave
          </TabsTrigger>
          <TabsTrigger value="gps" className="gap-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5" /> GPS Check-In
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 text-xs">
            <CheckSquare className="h-3.5 w-3.5" /> Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance"><PerformanceContracts /></TabsContent>
        <TabsContent value="leave"><LeaveManagement /></TabsContent>
        <TabsContent value="gps"><FieldCheckIns /></TabsContent>
        <TabsContent value="tasks"><TaskManagement /></TabsContent>
      </Tabs>
    </div>
  );
}
