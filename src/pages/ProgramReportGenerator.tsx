import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Program {
  id: string;
  name: string;
  description: string;
}

interface DateRange {
  from: Date;
  to: Date;
}

export const ProgramReportGenerator = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrograms();
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

  const setPresetDateRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    setDateRange({ from, to });
  };

  const generateReport = () => {
    if (!selectedProgram) {
      toast.error('Please select a program');
      return;
    }
    if (!dateRange) {
      toast.error('Please select a date range');
      return;
    }
    
    toast.success('Generating report...');
    // Report generation logic will be implemented in later phases
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

          {/* Generate Report Button */}
          <div className="pt-4">
            <Button 
              onClick={generateReport}
              disabled={!selectedProgram || !dateRange}
              className="w-full sm:w-auto"
            >
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview Area - Will be populated in later phases */}
      {selectedProgram && dateRange && (
        <Card>
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Report Configuration Complete</p>
              <p className="text-sm">
                Selected Program: {programs.find(p => p.id === selectedProgram)?.name}
              </p>
              <p className="text-sm">
                Date Range: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
              </p>
              <p className="text-sm mt-4 text-muted-foreground">
                Advanced analytics and visualizations will be available in the next phase.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};