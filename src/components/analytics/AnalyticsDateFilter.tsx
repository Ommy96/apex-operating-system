import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Filter, Download } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface AnalyticsDateFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  programFilter: string;
  onProgramFilterChange: (program: string) => void;
  programs: { id: string; name: string }[];
  onExport?: () => void;
}

export function AnalyticsDateFilter({
  dateRange,
  onDateRangeChange,
  programFilter,
  onProgramFilterChange,
  programs,
  onExport
}: AnalyticsDateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { label: "This Month", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: "Last Month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
    { label: "Last 3 Months", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: new Date() }) },
    { label: "Last 6 Months", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: new Date() }) },
    { label: "Last 30 Days", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
    { label: "Last 90 Days", getValue: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  ];

  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-muted/30 rounded-xl border">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Filters:</span>
      </div>

      {/* Date Range Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal min-w-[240px]",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Quick Ranges</p>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => {
                    onDateRangeChange(preset.getValue());
                    setIsOpen(false);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Program Filter */}
      <Select value={programFilter} onValueChange={onProgramFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Programs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Programs</SelectItem>
          {programs.map((program) => (
            <SelectItem key={program.id} value={program.id}>
              {program.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Export Button */}
      {onExport && (
        <Button variant="outline" onClick={onExport} className="ml-auto">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      )}
    </div>
  );
}
