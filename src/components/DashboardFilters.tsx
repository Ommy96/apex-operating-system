import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Filter, X, RotateCcw, Settings } from 'lucide-react';
import { addDays, subDays } from 'date-fns';

interface FilterSettings {
  dateRange: {
    from: Date;
    to: Date;
  } | null;
  categories: string[];
  metrics: string[];
  locations: string[];
  programs: string[];
}

interface DashboardFiltersProps {
  onFiltersChange: (filters: FilterSettings) => void;
  className?: string;
}

const CATEGORIES = [
  'Education',
  'Feeding Program', 
  'Talent Development',
  'Self Empowerment',
  'Family Adoption',
  'Support Groups'
];

const METRICS = [
  'Total Beneficiaries',
  'Active Programs',
  'Monthly Growth',
  'Completion Rate',
  'Attendance Rate',
  'Success Rate'
];

const LOCATIONS = [
  'Nairobi',
  'Mombasa', 
  'Kisumu',
  'Nakuru',
  'Eldoret',
  'Thika',
  'Machakos',
  'Kikuyu'
];

const PROGRAMS = [
  'Education',
  'Kibera Early Dinner',
  'Kawangware Lunch Hour',
  'Kipawa Sato',
  'Self-Empowerment',
  'Support Groups',
  'Communication',
  'Chess',
  'Fundraising',
  'Admin',
  'Content Creation'
];

export function DashboardFilters({ onFiltersChange, className = '' }: DashboardFiltersProps) {
  const [filters, setFilters] = useState<FilterSettings>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('dashboard-filters');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        dateRange: parsed.dateRange ? {
          from: new Date(parsed.dateRange.from),
          to: new Date(parsed.dateRange.to)
        } : null
      };
    }
    
    return {
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date()
      },
      categories: [],
      metrics: ['Total Beneficiaries', 'Active Programs'],
      locations: [],
      programs: []
    };
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Save to localStorage and emit changes
  useEffect(() => {
    localStorage.setItem('dashboard-filters', JSON.stringify(filters));
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilter = <K extends keyof FilterSettings>(
    key: K, 
    value: FilterSettings[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: 'categories' | 'metrics' | 'locations' | 'programs', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  const resetFilters = () => {
    const defaultFilters: FilterSettings = {
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date()
      },
      categories: [],
      metrics: ['Total Beneficiaries', 'Active Programs'],
      locations: [],
      programs: []
    };
    setFilters(defaultFilters);
  };

  const clearAllFilters = () => {
    setFilters({
      dateRange: null,
      categories: [],
      metrics: [],
      locations: [],
      programs: []
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange) count++;
    count += filters.categories.length;
    count += filters.metrics.length; 
    count += filters.locations.length;
    count += filters.programs.length;
    return count;
  };

  const QuickDatePresets = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateFilter('dateRange', {
          from: subDays(new Date(), 7),
          to: new Date()
        })}
        className="text-xs"
      >
        Last 7 days
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateFilter('dateRange', {
          from: subDays(new Date(), 30),
          to: new Date()
        })}
        className="text-xs"
      >
        Last 30 days
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateFilter('dateRange', {
          from: subDays(new Date(), 90),
          to: new Date()
        })}
        className="text-xs"
      >
        Last 3 months
      </Button>
    </div>
  );

  const FilterSection = ({ 
    title, 
    items, 
    selected, 
    onChange 
  }: { 
    title: string;
    items: string[];
    selected: string[];
    onChange: (value: string) => void;
  }) => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <label
            key={item}
            className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={selected.includes(item)}
              onCheckedChange={() => onChange(item)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="text-sm text-foreground flex-1">{item}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <Card className={`shadow-elevation-2 border-primary/20 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Dashboard Filters
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              <Settings className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Filter Summary */}
        <div className="flex flex-wrap gap-2">
          {filters.dateRange && (
            <Badge variant="outline" className="bg-primary/10 border-primary/30">
              {filters.dateRange.from.toLocaleDateString()} - {filters.dateRange.to.toLocaleDateString()}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => updateFilter('dateRange', null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {[...filters.categories, ...filters.metrics, ...filters.locations, ...filters.programs].map(filter => (
            <Badge key={filter} variant="outline" className="bg-accent/10 border-accent/30">
              {filter}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => {
                  if (CATEGORIES.includes(filter)) toggleArrayFilter('categories', filter);
                  else if (METRICS.includes(filter)) toggleArrayFilter('metrics', filter);
                  else if (LOCATIONS.includes(filter)) toggleArrayFilter('locations', filter);
                  else if (PROGRAMS.includes(filter)) toggleArrayFilter('programs', filter);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>

        {/* Date Range Filter */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Date Range</h4>
          <QuickDatePresets />
          <DatePickerWithRange
            date={filters.dateRange}
            onDateChange={(date) => updateFilter('dateRange', date)}
            placeholder="Select date range"
          />
        </div>

        {isExpanded && (
          <>
            <Separator />
            
            {/* Categories Filter */}
            <FilterSection
              title="Categories"
              items={CATEGORIES}
              selected={filters.categories}
              onChange={(value) => toggleArrayFilter('categories', value)}
            />

            <Separator />

            {/* Metrics Filter */}
            <FilterSection
              title="Metrics"
              items={METRICS}
              selected={filters.metrics}
              onChange={(value) => toggleArrayFilter('metrics', value)}
            />

            <Separator />

            {/* Locations Filter */}
            <FilterSection
              title="Locations"
              items={LOCATIONS}
              selected={filters.locations}
              onChange={(value) => toggleArrayFilter('locations', value)}
            />

            <Separator />

            {/* Programs Filter */}
            <FilterSection
              title="Programs"
              items={PROGRAMS}
              selected={filters.programs}
              onChange={(value) => toggleArrayFilter('programs', value)}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}