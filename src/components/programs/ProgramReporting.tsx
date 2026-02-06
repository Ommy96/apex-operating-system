import { useState } from "react";
import { FileText, Download, Calendar, Filter, BarChart3, Users, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { toast } from "sonner";

interface ProgramReportingProps {
  programId?: string;
}

export const ProgramReporting = ({ programId }: ProgramReportingProps) => {
  const { currentOrganization } = useOrganization();
  const [selectedProgram, setSelectedProgram] = useState(programId || "all");
  const [dateRange, setDateRange] = useState("month");

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

  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ['program-stats', selectedProgram, currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return null;
      
      // Get beneficiary count
      let beneficiaryQuery = supabase
        .from('beneficiary_services')
        .select('id', { count: 'exact' })
        .eq('organization_id', currentOrganization.organization_id);
      
      if (selectedProgram !== 'all') {
        beneficiaryQuery = beneficiaryQuery.eq('program_id', selectedProgram);
      }
      
      const { count: beneficiaryCount } = await beneficiaryQuery;

      // Get observation count
      let observationQuery = supabase
        .from('program_observations')
        .select('id', { count: 'exact' })
        .eq('organization_id', currentOrganization.organization_id);
      
      if (selectedProgram !== 'all') {
        observationQuery = observationQuery.eq('program_id', selectedProgram);
      }
      
      const { count: observationCount } = await observationQuery;

      // Get indicator stats
      let indicatorQuery = supabase
        .from('program_indicators')
        .select('target_value, current_value')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('is_active', true);
      
      if (selectedProgram !== 'all') {
        indicatorQuery = indicatorQuery.eq('program_id', selectedProgram);
      }
      
      const { data: indicators } = await indicatorQuery;
      
      const indicatorCount = indicators?.length || 0;
      const avgProgress = indicators?.length 
        ? Math.round(
            indicators.reduce((acc, ind) => {
              const progress = ind.target_value ? ((ind.current_value || 0) / ind.target_value) * 100 : 0;
              return acc + Math.min(progress, 100);
            }, 0) / indicators.length
          )
        : 0;

      return {
        beneficiaries: beneficiaryCount || 0,
        observations: observationCount || 0,
        indicators: indicatorCount,
        avgProgress,
      };
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch recent observations
  const { data: recentObservations } = useQuery({
    queryKey: ['recent-observations', selectedProgram, currentOrganization?.organization_id],
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
        .order('observation_date', { ascending: false })
        .limit(5);
      
      if (selectedProgram !== 'all') {
        query = query.eq('program_id', selectedProgram);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.organization_id,
  });

  // Fetch indicators for export
  const { data: indicatorsData } = useQuery({
    queryKey: ['indicators-export', selectedProgram, currentOrganization?.organization_id],
    queryFn: async () => {
      if (!currentOrganization?.organization_id) return [];
      
      let query = supabase
        .from('program_indicators')
        .select(`
          name, indicator_type, measurement_unit, target_value, current_value, reporting_frequency,
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

  const handleExport = (type: 'indicators' | 'observations') => {
    try {
      let csvContent = '';
      const timestamp = format(new Date(), 'yyyy-MM-dd');
      
      if (type === 'indicators' && indicatorsData) {
        csvContent = 'Indicator,Type,Unit,Target,Current,Progress %,Frequency,Program,Project\n';
        indicatorsData.forEach((ind) => {
          const progress = ind.target_value ? Math.round(((ind.current_value || 0) / ind.target_value) * 100) : 0;
          csvContent += `"${ind.name}",${ind.indicator_type},${ind.measurement_unit},${ind.target_value || 0},${ind.current_value || 0},${progress}%,${ind.reporting_frequency},"${(ind.programs as { name: string })?.name || ''}","${(ind.projects as { name: string })?.name || ''}"\n`;
        });
      } else if (type === 'observations' && recentObservations) {
        csvContent = 'Date,Category,Status,Beneficiary,Program,Notes\n';
        recentObservations.forEach((obs) => {
          csvContent += `${obs.observation_date},${obs.observation_category || ''},${obs.status || ''},"${(obs.beneficiaries as { display_name: string })?.display_name || ''}","${(obs.programs as { name: string })?.name || ''}","${obs.narrative_notes.replace(/"/g, '""')}"\n`;
        });
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `program-${type}-${timestamp}.csv`;
      link.click();
      toast.success(`${type} exported successfully`);
    } catch (error) {
      toast.error('Export failed');
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Program Reporting</h3>
          <p className="text-sm text-muted-foreground">
            View summaries and export program data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-[200px]">
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Beneficiaries Served
            </CardDescription>
            <CardTitle className="text-2xl">{stats?.beneficiaries || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observations
            </CardDescription>
            <CardTitle className="text-2xl">{stats?.observations || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Active Indicators
            </CardDescription>
            <CardTitle className="text-2xl">{stats?.indicators || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg. Progress
            </CardDescription>
            <CardTitle className="text-2xl">{stats?.avgProgress || 0}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="indicators">Indicators</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Programs Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Programs by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['active', 'planning', 'completed', 'on_hold'].map((status) => {
                    const count = programs?.filter(p => p.status === status).length || 0;
                    const total = programs?.length || 1;
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            status === 'active' ? 'bg-success' : 
                            status === 'planning' ? 'bg-muted-foreground' : 
                            status === 'completed' ? 'bg-primary' : 'bg-warning'
                          }`} />
                          <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{count}</span>
                          <span className="text-xs text-muted-foreground">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Observations</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => handleExport('observations')}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {recentObservations?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent observations</p>
                ) : (
                  <div className="space-y-3">
                    {recentObservations?.slice(0, 4).map((obs) => (
                      <div key={obs.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {(obs.beneficiaries as { display_name: string })?.display_name || 'General'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{obs.narrative_notes}</p>
                        </div>
                        <Badge variant="outline" className={`shrink-0 text-xs ${getStatusColor(obs.status)}`}>
                          {obs.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="indicators" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Indicators Performance</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport('indicators')}>
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
                          <tr key={ind.name} className="border-b border-border/50">
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
              <CardTitle className="text-base">All Observations</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport('observations')}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {recentObservations?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No observations recorded</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Date</th>
                        <th className="text-left py-2 font-medium">Beneficiary</th>
                        <th className="text-left py-2 font-medium">Category</th>
                        <th className="text-left py-2 font-medium">Status</th>
                        <th className="text-left py-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentObservations?.map((obs) => (
                        <tr key={obs.id} className="border-b border-border/50">
                          <td className="py-2">{format(new Date(obs.observation_date), 'MMM d, yyyy')}</td>
                          <td className="py-2">{(obs.beneficiaries as { display_name: string })?.display_name || '-'}</td>
                          <td className="py-2 capitalize">{obs.observation_category || '-'}</td>
                          <td className="py-2">
                            <Badge variant="outline" className={`text-xs ${getStatusColor(obs.status)}`}>
                              {obs.status}
                            </Badge>
                          </td>
                          <td className="py-2 max-w-xs truncate">{obs.narrative_notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
