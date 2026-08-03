import { logger } from "@/lib/logger";
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Library, 
  LayoutGrid, 
  List,
  Target,
  TrendingUp,
  Settings2,
  Loader2,
} from 'lucide-react';
import { useIndicators, useIndicatorCategories, useIndicatorTargets, Indicator, IndicatorTarget } from '@/hooks/useIndicators';
import { useOrganization } from '@/hooks/useOrganization';
import { computeAllIndicators } from '@/lib/indicatorComputation';
import { IndicatorCard } from './IndicatorCard';
import { IndicatorTrafficLight, TrafficLightSummaryBar } from './IndicatorTrafficLight';
import { IndicatorForm } from './IndicatorForm';
import { IndicatorTargetForm } from './IndicatorTargetForm';
import { TemplateLibrary } from './TemplateLibrary';
import { IndicatorDetailView } from './IndicatorDetailView';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ComputedValue {
  current: { value: number; periodStart: Date; periodEnd: Date };
  previous: { value: number; periodStart: Date; periodEnd: Date };
  trendPercentage: number;
}

export function IndicatorsDashboard() {
  const { currentOrganization } = useOrganization();
  const { data: indicators = [], isLoading: loadingIndicators, refetch } = useIndicators();
  const { data: categories = [] } = useIndicatorCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isComputing, setIsComputing] = useState(false);
  const [computedValues, setComputedValues] = useState<Map<string, ComputedValue>>(new Map());
  
  // Dialogs
  const [showIndicatorForm, setShowIndicatorForm] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);

  // Compute values when indicators change
  useEffect(() => {
    if (indicators.length > 0 && currentOrganization?.organization_id) {
      computeValues();
    }
  }, [indicators, currentOrganization?.organization_id]);

  const computeValues = async () => {
    if (!currentOrganization?.organization_id || indicators.length === 0) return;
    
    setIsComputing(true);
    try {
      const results = await computeAllIndicators(
        indicators,
        currentOrganization.organization_id
      );
      setComputedValues(results);
    } catch (error) {
      logger.error('Error computing indicator values:', error);
    } finally {
      setIsComputing(false);
    }
  };

  // Filter indicators
  const filteredIndicators = useMemo(() => {
    return indicators.filter(indicator => {
      const matchesSearch = 
        indicator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        indicator.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        indicator.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = 
        selectedCategory === 'all' || 
        indicator.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [indicators, searchQuery, selectedCategory]);

  const handleIndicatorClick = (indicator: Indicator) => {
    setSelectedIndicator(indicator);
    setShowDetailView(true);
  };

  const handleSetTarget = (indicator: Indicator) => {
    setSelectedIndicator(indicator);
    setShowTargetForm(true);
  };

  const handleRefresh = async () => {
    await refetch();
    await computeValues();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Indicators</h1>
          <p className="text-muted-foreground">
            Track key metrics and monitor progress towards your goals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isComputing}
          >
            {isComputing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowTemplateLibrary(true)}
          >
            <Library className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button 
            size="sm"
            onClick={() => {
              setSelectedIndicator(null);
              setShowIndicatorForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Indicator
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search indicators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{indicators.length}</p>
                <p className="text-xs text-muted-foreground">Total Indicators</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {[...computedValues.values()].filter(v => v.trendPercentage > 0).length}
                </p>
                <p className="text-xs text-muted-foreground">Improving</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Target className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Settings2 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {indicators.filter(i => i.show_trend).length}
                </p>
                <p className="text-xs text-muted-foreground">With Trends</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Light Summary */}
      {filteredIndicators.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <TrafficLightSummaryBar
              indicators={filteredIndicators.map((ind) => {
                const computed = computedValues.get(ind.id);
                return { actual: computed?.current.value ?? null, target: (ind as any).currentTarget ?? null };
              })}
            />
          </CardContent>
        </Card>
      )}

      {/* Indicators Grid/List */}
      {loadingIndicators ? (
        <div className={cn(
          'gap-4',
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
        )}>
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-5 w-3/4 mb-4" />
                <Skeleton className="h-10 w-1/2 mb-3" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredIndicators.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No indicators found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {indicators.length === 0
                ? 'Get started by importing from our template library or creating a custom indicator.'
                : 'Try adjusting your search or category filter.'}
            </p>
            {indicators.length === 0 && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowTemplateLibrary(true)}>
                  <Library className="h-4 w-4 mr-2" />
                  Browse Templates
                </Button>
                <Button onClick={() => setShowIndicatorForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Indicator
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          'gap-4',
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
        )}>
          {filteredIndicators.map((indicator) => {
            const computed = computedValues.get(indicator.id);
            return (
              <IndicatorCard
                key={indicator.id}
                indicator={indicator}
                currentValue={computed?.current.value ?? 0}
                previousValue={computed?.previous.value}
                trendPercentage={computed?.trendPercentage}
                onClick={() => handleIndicatorClick(indicator)}
              />
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <IndicatorForm
        open={showIndicatorForm}
        onOpenChange={setShowIndicatorForm}
        indicator={selectedIndicator || undefined}
        categories={categories}
      />

      <TemplateLibrary
        open={showTemplateLibrary}
        onOpenChange={setShowTemplateLibrary}
      />

      {selectedIndicator && (
        <>
          <IndicatorTargetForm
            open={showTargetForm}
            onOpenChange={setShowTargetForm}
            indicator={selectedIndicator}
          />
          <IndicatorDetailView
            open={showDetailView}
            onOpenChange={setShowDetailView}
            indicator={selectedIndicator}
            computedValue={computedValues.get(selectedIndicator.id)}
            onSetTarget={() => {
              setShowDetailView(false);
              setShowTargetForm(true);
            }}
            onEdit={() => {
              setShowDetailView(false);
              setShowIndicatorForm(true);
            }}
          />
        </>
      )}
    </div>
  );
}
