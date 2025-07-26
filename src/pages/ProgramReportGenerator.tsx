import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, X, Users, TrendingUp, Activity, BarChart3 } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Program {
  id: string;
  name: string;
  description: string;
}

interface Staff {
  id: string;
  full_name: string;
  email: string;
}

interface DateRange {
  from: Date;
  to: Date;
}

interface ReportData {
  totalParticipants: number;
  totalActivities: number;
  averageAttendance: number;
  completionRate: number;
  staffEngagement: number;
}

export const ProgramReportGenerator = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [staffSearchTerm, setStaffSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetchPrograms();
    fetchStaff();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (error) throw error;
      
      const staffData = (data || []).map(profile => ({
        id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email
      }));
      
      setStaff(staffData);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff');
    }
  };

  const fetchReportData = async () => {
    if (!selectedProgram || !dateRange) return;
    
    setGeneratingReport(true);
    try {
      // Fetch activities for the selected program and date range
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*, children(id, first_name, last_name)')
        .eq('program_id', selectedProgram)
        .gte('activity_date', dateRange.from.toISOString().split('T')[0])
        .lte('activity_date', dateRange.to.toISOString().split('T')[0]);

      if (activitiesError) throw activitiesError;

      // Fetch child programs data
      const { data: childPrograms, error: childProgramsError } = await supabase
        .from('child_programs')
        .select('*')
        .eq('program_id', selectedProgram)
        .gte('enrollment_date', dateRange.from.toISOString().split('T')[0])
        .lte('enrollment_date', dateRange.to.toISOString().split('T')[0]);

      if (childProgramsError) throw childProgramsError;

      // Calculate metrics
      const totalParticipants = new Set(activities?.map(a => a.child_id)).size;
      const totalActivities = activities?.length || 0;
      const activeParticipants = childPrograms?.filter(cp => cp.status === 'active').length || 0;
      const completedParticipants = childPrograms?.filter(cp => cp.status === 'completed').length || 0;
      
      const reportMetrics: ReportData = {
        totalParticipants,
        totalActivities,
        averageAttendance: totalActivities > 0 ? (totalParticipants / totalActivities) * 100 : 0,
        completionRate: (activeParticipants + completedParticipants) > 0 ? (completedParticipants / (activeParticipants + completedParticipants)) * 100 : 0,
        staffEngagement: activities?.filter(a => a.created_by).length || 0
      };

      setReportData(reportMetrics);
      toast.success('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const setPresetDateRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    setDateRange({ from, to });
  };

  const handleStaffSelection = (staffId: string, checked: boolean) => {
    if (checked) {
      setSelectedStaff([...selectedStaff, staffId]);
    } else {
      setSelectedStaff(selectedStaff.filter(id => id !== staffId));
    }
  };

  const removeStaffMember = (staffId: string) => {
    setSelectedStaff(selectedStaff.filter(id => id !== staffId));
  };

  const filteredStaff = staff.filter(member =>
    member.full_name.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(staffSearchTerm.toLowerCase())
  );

  const generateReport = () => {
    if (!selectedProgram) {
      toast.error('Please select a program');
      return;
    }
    if (!dateRange) {
      toast.error('Please select a date range');
      return;
    }
    
    fetchReportData();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Program-Specific Report Generator</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Program Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Program</label>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a program..." />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-4">
            <label className="text-sm font-medium">Date Range</label>
            
            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetDateRange(7)}
                className="text-xs"
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetDateRange(30)}
                className="text-xs"
              >
                Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetDateRange(90)}
                className="text-xs"
              >
                Last 90 Days
              </Button>
            </div>

            {/* Custom Date Range Picker */}
            <div>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                placeholder="Select custom date range"
              />
            </div>
          </div>

          {/* Staff Selection */}
          <div className="space-y-4">
            <label className="text-sm font-medium">Filter by Staff Members (Optional)</label>
            
            {/* Search Input */}
            <Input
              placeholder="Search staff members..."
              value={staffSearchTerm}
              onChange={(e) => setStaffSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            
            {/* Selected Staff Badges */}
            {selectedStaff.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedStaff.map((staffId) => {
                  const staffMember = staff.find(s => s.id === staffId);
                  return (
                    <Badge key={staffId} variant="secondary" className="flex items-center gap-1">
                      {staffMember?.full_name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeStaffMember(staffId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
            
            {/* Staff Checkboxes */}
            <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staffMember) => (
                  <div key={staffMember.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={staffMember.id}
                      checked={selectedStaff.includes(staffMember.id)}
                      onCheckedChange={(checked) => 
                        handleStaffSelection(staffMember.id, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={staffMember.id} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {staffMember.full_name}
                      <span className="text-muted-foreground ml-1">({staffMember.email})</span>
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No staff members found</p>
              )}
            </div>
          </div>

          {/* Generate Report Button */}
          <div className="pt-4">
            <Button 
              onClick={generateReport}
              disabled={!selectedProgram || !dateRange || generatingReport}
              className="w-full sm:w-auto"
            >
              {generatingReport ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Data Display */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{reportData.totalParticipants}</p>
                  <p className="text-sm text-muted-foreground">Total Participants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{reportData.totalActivities}</p>
                  <p className="text-sm text-muted-foreground">Total Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{reportData.averageAttendance.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Avg Attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{reportData.completionRate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Preview Area */}
      {selectedProgram && dateRange && (
        <Card>
          <CardHeader>
            <CardTitle>
              {reportData ? 'Program Report Summary' : 'Report Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Program Details</h3>
                    <p className="text-sm text-muted-foreground">
                      <strong>Program:</strong> {programs.find(p => p.id === selectedProgram)?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Period:</strong> {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                    </p>
                    {selectedStaff.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Filtered by:</strong> {selectedStaff.length} staff member(s)
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Key Insights</h3>
                    <div className="space-y-1 text-sm">
                      <p>• {reportData.totalParticipants} unique participants engaged</p>
                      <p>• {reportData.totalActivities} program activities conducted</p>
                      <p>• {reportData.staffEngagement} activities had staff involvement</p>
                      <p>• {reportData.completionRate.toFixed(1)}% program completion rate</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    📊 Advanced analytics, visualizations, and detailed breakdowns will be available in Phase 3.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Ready to Generate Report</p>
                <p className="text-sm">
                  Selected Program: {programs.find(p => p.id === selectedProgram)?.name}
                </p>
                <p className="text-sm">
                  Date Range: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                </p>
                {selectedStaff.length > 0 && (
                  <p className="text-sm">
                    Staff Filter: {selectedStaff.length} member(s) selected
                  </p>
                )}
                <p className="text-sm mt-4 text-muted-foreground">
                  Click "Generate Report" to view program participation metrics.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};