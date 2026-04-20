import { useMemo } from "react";
import { CalendarIcon, Filter, RotateCcw } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, subDays, startOfYear } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { KENYA_COUNTIES } from "@/lib/kenyaCounties";
import type { AgeBucket, AnalyticsFilters } from "@/hooks/useAnalyticsFilters";

interface AnalyticsGlobalFilterBarProps {
  filters: AnalyticsFilters;
  programs: { id: string; name: string }[];
  onDateRangeChange: (range: DateRange | undefined) => void;
  onCountyChange: (county: string) => void;
  onProgramChange: (programId: string) => void;
  onGenderChange: (gender: string) => void;
  onAgeBucketChange: (bucket: AgeBucket) => void;
  onReset: () => void;
}

const AGE_BUCKETS: { value: AgeBucket; label: string }[] = [
  { value: "all", label: "All ages" },
  { value: "0-5", label: "0–5 (Early childhood)" },
  { value: "6-12", label: "6–12 (Primary)" },
  { value: "13-17", label: "13–17 (Secondary)" },
  { value: "18-35", label: "18–35 (Youth)" },
  { value: "36-60", label: "36–60 (Adult)" },
  { value: "60+", label: "60+ (Senior)" },
];

/**
 * Persistent filter bar shared across every analytics tab.
 *
 * Filter values live in a `useAnalyticsFilters()` hook and are passed down
 * to every tab's queries via React Query keys.
 */
export function AnalyticsGlobalFilterBar({
  filters,
  programs,
  onDateRangeChange,
  onCountyChange,
  onProgramChange,
  onGenderChange,
  onAgeBucketChange,
  onReset,
}: AnalyticsGlobalFilterBarProps) {
  const { dateRange } = filters;

  const presets = useMemo(
    () => [
      { label: "This year", value: () => ({ from: startOfYear(new Date()), to: new Date() }) },
      { label: "This month", value: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
      { label: "Last month", value: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
      { label: "Last 90 days", value: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
      { label: "Last 6 months", value: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: new Date() }) },
      { label: "Last 12 months", value: () => ({ from: startOfMonth(subMonths(new Date(), 11)), to: new Date() }) },
    ],
    []
  );

  const counties = useMemo(() => Object.keys(KENYA_COUNTIES).sort(), []);

  const labelForRange = () => {
    if (!dateRange?.from) return "Select date range";
    if (!dateRange.to) return format(dateRange.from, "LLL dd, y");
    return `${format(dateRange.from, "LLL dd, y")} – ${format(dateRange.to, "LLL dd, y")}`;
  };

  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 pr-2 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
        </div>

        {/* Date range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 justify-start text-left font-normal min-w-[230px]",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {labelForRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              <div className="border-r p-3 space-y-1 min-w-[140px]">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Quick ranges
                </p>
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => onDateRangeChange(preset.value())}
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

        {/* County */}
        <Select value={filters.county} onValueChange={onCountyChange}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder="County" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">All counties</SelectItem>
            {counties.map((county) => (
              <SelectItem key={county} value={county}>
                {county}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Programme */}
        <Select value={filters.programId} onValueChange={onProgramChange}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Programme" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">All programmes</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Gender */}
        <Select value={filters.gender} onValueChange={onGenderChange}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genders</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Age bucket */}
        <Select
          value={filters.ageBucket}
          onValueChange={(v) => onAgeBucketChange(v as AgeBucket)}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Age group" />
          </SelectTrigger>
          <SelectContent>
            {AGE_BUCKETS.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="ml-auto h-9 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}
