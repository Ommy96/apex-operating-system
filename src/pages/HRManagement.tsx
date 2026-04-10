import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, MapPin, CheckSquare, Users, Heart, Briefcase, Clock } from "lucide-react";
import { PerformanceContracts, LeaveManagement, FieldCheckIns, TaskManagement } from "@/components/hr";
import { StaffDirectory } from "@/components/hr/StaffDirectory";
import { VolunteerDirectory } from "@/components/hr/VolunteerDirectory";
import { VolunteerAssignments } from "@/components/hr/VolunteerAssignments";
import { VolunteerHoursLog } from "@/components/hr/VolunteerHoursLog";

export default function HRManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR & People Management</h1>
        <p className="text-muted-foreground text-sm">Staff directory, volunteers, performance contracts, leave, GPS verification & task tracking</p>
      </div>

      <Tabs defaultValue="staff" className="space-y-4">
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto bg-muted/50">
            <TabsTrigger value="staff" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> Staff
            </TabsTrigger>
            <TabsTrigger value="volunteers" className="gap-1.5 text-xs">
              <Heart className="h-3.5 w-3.5" /> Volunteers
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-1.5 text-xs">
              <Briefcase className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Assignments</span>
              <span className="sm:hidden">Assign</span>
            </TabsTrigger>
            <TabsTrigger value="hours" className="gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hours Log</span>
              <span className="sm:hidden">Hours</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Performance</span>
              <span className="sm:hidden">Perf</span>
            </TabsTrigger>
            <TabsTrigger value="leave" className="gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" /> Leave
            </TabsTrigger>
            <TabsTrigger value="gps" className="gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">GPS Check-In</span>
              <span className="sm:hidden">GPS</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 text-xs">
              <CheckSquare className="h-3.5 w-3.5" /> Tasks
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="staff"><StaffDirectory /></TabsContent>
        <TabsContent value="volunteers"><VolunteerDirectory /></TabsContent>
        <TabsContent value="assignments"><VolunteerAssignments /></TabsContent>
        <TabsContent value="hours"><VolunteerHoursLog /></TabsContent>
        <TabsContent value="performance"><PerformanceContracts /></TabsContent>
        <TabsContent value="leave"><LeaveManagement /></TabsContent>
        <TabsContent value="gps"><FieldCheckIns /></TabsContent>
        <TabsContent value="tasks"><TaskManagement /></TabsContent>
      </Tabs>
    </div>
  );
}
