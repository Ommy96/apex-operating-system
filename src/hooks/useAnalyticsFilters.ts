import { useState, useCallback, useMemo } from "react";
import { startOfYear, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";

/**
 * Global filter state shared across all 9 analytics tabs.
 *
 * Every tab component receives the resolved filter values as props and
 * applies them to its Supabase queries. Defaults to "current calendar year".
 */

export type AgeBucket = "all" | "0-5" | "6-12" | "13-17" | "18-35" | "36-60" | "60+";

export interface AnalyticsFilters {
  dateRange: DateRange | undefined;
  county: string; // "all" or county name
  programId: string; // "all" or program UUID
  gender: string; // "all" | "male" | "female" | "other"
  ageBucket: AgeBucket;
}

const defaultFilters = (): AnalyticsFilters => ({
  dateRange: {
    from: startOfYear(new Date()),
    to: endOfDay(new Date()),
  },
  county: "all",
  programId: "all",
  gender: "all",
  ageBucket: "all",
});

export function useAnalyticsFilters() {
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters);

  const setDateRange = useCallback((dateRange: DateRange | undefined) => {
    setFilters((prev) => ({ ...prev, dateRange }));
  }, []);

  const setCounty = useCallback((county: string) => {
    setFilters((prev) => ({ ...prev, county }));
  }, []);

  const setProgramId = useCallback((programId: string) => {
    setFilters((prev) => ({ ...prev, programId }));
  }, []);

  const setGender = useCallback((gender: string) => {
    setFilters((prev) => ({ ...prev, gender }));
  }, []);

  const setAgeBucket = useCallback((ageBucket: AgeBucket) => {
    setFilters((prev) => ({ ...prev, ageBucket }));
  }, []);

  const reset = useCallback(() => setFilters(defaultFilters()), []);

  // Stable filter key for React Query cache invalidation
  const filterKey = useMemo(
    () => [
      filters.dateRange?.from?.toISOString() ?? "",
      filters.dateRange?.to?.toISOString() ?? "",
      filters.county,
      filters.programId,
      filters.gender,
      filters.ageBucket,
    ],
    [filters]
  );

  return {
    filters,
    filterKey,
    setDateRange,
    setCounty,
    setProgramId,
    setGender,
    setAgeBucket,
    reset,
  };
}
