import { useState, useMemo } from "react";
import { FileText, Download, Calendar, Filter, BarChart3, Users, Target, TrendingUp, FileDown, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAvailableComputedIndicators } from "@/hooks/useIndicatorComputation";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";

interface EnhancedProgramReportingProps {
  programId?: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

type DateRangePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export const EnhancedProgramReporting = ({ programId }: EnhancedProgramReportingProps) => {
  const { currentOrganization } = useOrganization();
  const [selectedProgram, setSelectedProgram] = useState(programId || "all");
  const [dateRange, setDateRange] = useState<DateRangePreset>("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Get computed indicators
  const { indicators: computedIndicators, isLoading: computingIndicators } = useAvailableComputedIndicators(
    selectedProgram !== 'all' ? selectedProgram : undefined
  );

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { startDate: format(now, 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
      case 'week':
        return { startDate: format(subDays(now, 7), 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
      case 'month':
        return { startDate: format(startOfMonth(now), 'yyyy-MM-dd'), endDate: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'quarter':
        return { startDate: format(subMonths(now, 3), 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
      case 'year':
        return { startDate: format(subMonths(now, 12), 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
      case 'custom':
        return { startDate: customStartDate, endDate: customEndDate };
      default:
        return { startDate: format(startOfMonth(now), 'yyyy-MM-dd'), endDate: format(now, 'yyyy-MM-dd') };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['programs-list', currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, status, category')
        .eq('organization_id', currentOrganization.organization_id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch observations with date filter
  const { data: observations } = useQuery({
    queryKey: ['observations-report', selectedProgram, startDate, endDate, currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      
      let query = supabase
        .from('program_observations')
        .select(`
          id, observation_date, observation_category, status, narrative_notes,
          programs:program_id (name),
          beneficiaries:beneficiary_id (display_name)
        `)
        .eq('organization_id', currentOrganization.organization_id)
        .gte('observation_date', startDate)
        .lte('observation_date', endDate)
        .order('observation_date', { ascending: false });
      
      if (selectedProgram !== 'all') {
        query = query.eq('program_id', selectedProgram);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id && !!startDate && !!endDate,
  });

  // Fetch indicators
  const { data: indicatorsData } = useQuery({
    queryKey: ['indicators-report', selectedProgram, currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      
      let query = supabase
        .from('program_indicators')
        .select(`
          id, name, indicator_type, measurement_unit, target_value, current_value, reporting_frequency,
          programs:program_id (name),
          projects:project_id (name)
        `)
        .eq('organization_id', currentOrganization.organization_id)
        .eq('is_active', true);
      
      if (selectedProgram !== 'all') {
        query = query.eq('program_id', selectedProgram);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Prepare chart data
  const observationsByCategory = useMemo(() => {
    if (!observations) return [];
    const counts: Record<string, number> = {};
    observations.forEach(obs => {
      const cat = obs.observation_category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [observations]);

  const observationsByStatus = useMemo(() => {
    if (!observations) return [];
    const counts: Record<string, number> = {};
    observations.forEach(obs => {
      const status = obs.status || 'open';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [observations]);

  const indicatorProgress = useMemo(() => {
    if (!indicatorsData) return [];
    return indicatorsData.slice(0, 8).map(ind => ({
      name: ind.name.length > 20 ? ind.name.slice(0, 20) + '...' : ind.name,
      target: ind.target_value || 0,
      current: ind.current_value || 0,
      progress: ind.target_value ? Math.round(((ind.current_value || 0) / ind.target_value) * 100) : 0,
    }));
  }, [indicatorsData]);

  // Export functions
  const handleExportCSV = (type: 'indicators' | 'observations' | 'computed') => {
    try {
      let csvContent = '';
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
      let filename = '';
      
      if (type === 'indicators' && indicatorsData) {
        csvContent = 'Indicator,Type,Unit,Target,Current,Progress %,Frequency,Program\n';
        indicatorsData.forEach((ind) => {
          const progress = ind.target_value ? Math.round(((ind.current_value || 0) / ind.target_value) * 100) : 0;
          csvContent += `"${ind.name}",${ind.indicator_type},${ind.measurement_unit},${ind.target_value || 0},${ind.current_value || 0},${progress}%,${ind.reporting_frequency},"${(ind.programs as { name: string })?.name || ''}"\n`;
        });
        filename = `indicators-${timestamp}.csv`;
      } else if (type === 'observations' && observations) {
        csvContent = 'Date,Category,Status,Beneficiary,Program,Notes\n';
        observations.forEach((obs) => {
          csvContent += `${obs.observation_date},${obs.observation_category || ''},${obs.status || ''},"${(obs.beneficiaries as { display_name: string })?.display_name || ''}","${(obs.programs as { name: string })?.name || ''}","${obs.narrative_notes.replace(/"/g, '""')}"\n`;
        });
        filename = `observations-${startDate}-to-${endDate}-${timestamp}.csv`;
      } else if (type === 'computed' && computedIndicators) {
        csvContent = 'Indicator,Category,Current Value,Unit\n';
        computedIndicators.forEach((ind) => {
          csvContent += `"${ind.name}","${ind.category}",${ind.currentValue ?? 'N/A'},${ind.unit}\n`;
        });
        filename = `computed-indicators-${timestamp}.csv`;
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      toast.success(`Exported ${type} successfully`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(18);
      doc.text('Program Report', pageWidth / 2, 20, { align: 'center' });
      
      // Subtitle
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Period: ${startDate} to ${endDate}`, pageWidth / 2, 34, { align: 'center' });
      
      let yPos = 45;
      
      // Summary Stats
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Summary Statistics', 14, yPos);
      yPos += 8;
      
      const summaryData = [
        ['Total Observations', (observations?.length || 0).toString()],
        ['Active Indicators', (indicatorsData?.length || 0).toString()],
        ['Avg. Progress', indicatorProgress.length > 0 
          ? `${Math.round(indicatorProgress.reduce((a, b) => a + b.progress, 0) / indicatorProgress.length)}%`
          : 'N/A'],
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Indicators Table
      if (indicatorsData && indicatorsData.length > 0) {
        doc.setFontSize(14);
        doc.text('Indicator Performance', 14, yPos);
        yPos += 8;
        
        const indicatorRows = indicatorsData.map(ind => [
          ind.name,
          ind.indicator_type,
          (ind.target_value || 0).toString(),
          (ind.current_value || 0).toString(),
          `${ind.target_value ? Math.round(((ind.current_value || 0) / ind.target_value) * 100) : 0}%`,
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Indicator', 'Type', 'Target', 'Current', 'Progress']],
          body: indicatorRows,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8 },
        });
      }
      
      // Save
      doc.save(`program-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF report generated');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'open': return 'bg-warning/10 text-warning';
      case 'in_progress': return 'bg-primary/10 text-primary';
      case 'resolved': return 'bg-success/10 text-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Enhanced Program Reporting</h3>
          <p className="text-sm text-muted-foreground">
            Analyze performance with interactive charts and exports
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Program</Label>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Date Range</Label>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangePreset)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
                <SelectItem value="year">Last 12 Months</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {dateRange === 'custom' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[140px]"
                />
              </div>
            </>
          )}
          
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Quick Stats from Computed Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {computedIndicators.slice(0, 4).map((ind) => (
          <Card key={ind.id}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{ind.name}</CardDescription>
              <CardTitle className="text-2xl">
                {ind.currentValue ?? '—'}
                {ind.unit === 'percentage' && '%'}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="charts" className="w-full">
        <TabsList>
          <TabsTrigger value="charts">
            <BarChart3 className="h-4 w-4 mr-1" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="indicators">
            <Target className="h-4 w-4 mr-1" />
            Indicators
          </TabsTrigger>
          <TabsTrigger value="observations">
            <FileText className="h-4 w-4 mr-1" />
            Observations
          </TabsTrigger>
          <TabsTrigger value="computed">
            <TrendingUp className="h-4 w-4 mr-1" />
            Live Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Observations by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observations by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {observationsByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data for selected period</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie>
                      <Pie
                        data={observationsByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {observationsByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Observations by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observations by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {observationsByStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data for selected period</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={observationsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Indicator Progress */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Indicator Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {indicatorProgress.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No indicators defined</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={indicatorProgress} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} unit="%" className="text-xs" />
                      <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                      <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
                      <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="indicators" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Indicators Performance</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExportCSV('indicators')}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {indicatorsData?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No indicators defined</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Indicator</th>
                        <th className="text-left py-2 font-medium">Type</th>
                        <th className="text-right py-2 font-medium">Target</th>
                        <th className="text-right py-2 font-medium">Current</th>
                        <th className="text-right py-2 font-medium">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indicatorsData?.map((ind) => {
                        const progress = ind.target_value ? Math.round(((ind.current_value || 0) / ind.target_value) * 100) : 0;
                        return (
                          <tr key={ind.id} className="border-b border-border/50">
                            <td className="py-2">{ind.name}</td>
                            <td className="py-2 capitalize">{ind.indicator_type}</td>
                            <td className="py-2 text-right">{ind.target_value || '-'}</td>
                            <td className="py-2 text-right">{ind.current_value || 0}</td>
                            <td className="py-2 text-right">
                              <Badge variant={progress >= 100 ? 'default' : progress >= 50 ? 'secondary' : 'outline'}>
                                {progress}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="observations" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Observations ({observations?.length || 0})</CardTitle>
                <CardDescription>Period: {startDate} to {endDate}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExportCSV('observations')}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {observations?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No observations in selected period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Date</th>
                        <th className="text-left py-2 font-medium">Beneficiary</th>
                        <th className="text-left py-2 font-medium">Category</th>
                        <th className="text-left py-2 font-medium">Status</th>
                        <th className="text-left py-2 font-medium max-w-[300px]">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {observations?.map((obs) => (
                        <tr key={obs.id} className="border-b border-border/50">
                          <td className="py-2">{format(new Date(obs.observation_date), 'MMM d, yyyy')}</td>
                          <td className="py-2">{(obs.beneficiaries as { display_name: string })?.display_name || 'General'}</td>
                          <td className="py-2 capitalize">{obs.observation_category || '-'}</td>
                          <td className="py-2">
                            <Badge variant="outline" className={getStatusColor(obs.status)}>
                              {obs.status}
                            </Badge>
                          </td>
                          <td className="py-2 max-w-[300px] truncate">{obs.narrative_notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="computed" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Live Computed Metrics</CardTitle>
                <CardDescription>Auto-calculated from your data in real-time</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExportCSV('computed')}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {computingIndicators ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {computedIndicators.map((ind) => (
                    <div key={ind.id} className="p-4 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground mb-1">{ind.category}</p>
                      <p className="font-medium text-sm">{ind.name}</p>
                      <p className="text-2xl font-bold mt-2">
                        {ind.currentValue ?? '—'}
                        {ind.unit === 'percentage' && '%'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
