import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Target, MessageSquare, FileText, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { ProgramObservations, ProgramIndicators, ProgramReporting } from "@/components/programs";
import { format } from "date-fns";

const ProgramDashboard = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch program details
  const { data: program, isLoading } = useQuery({
    queryKey: ['program-detail', programId],
    queryFn: async () => {
      if (!programId) return null;
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  // Fetch projects under this program
  const { data: projects } = useQuery({
    queryKey: ['program-projects', programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('program_id', programId)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  // Fetch beneficiary count
  const { data: beneficiaryCount } = useQuery({
    queryKey: ['program-beneficiaries-count', programId],
    queryFn: async () => {
      if (!programId || !currentOrganization?.organization_id) return 0;
      const { count, error } = await supabase
        .from('beneficiary_services')
        .select('id', { count: 'exact' })
        .eq('program_id', programId)
        .eq('organization_id', currentOrganization.organization_id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!programId && !!currentOrganization?.organization_id,
  });

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      planning: "bg-muted text-muted-foreground",
      active: "bg-success/10 text-success border-success/20",
      on_hold: "bg-warning/10 text-warning border-warning/20",
      completed: "bg-primary/10 text-primary border-primary/20",
    };
    return styles[status || "planning"] || styles.planning;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Program not found</p>
        <Button variant="link" onClick={() => navigate('/programs-management')}>
          Back to Programs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/programs-management')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{program.name}</h1>
            <Badge variant="outline" className={getStatusBadge(program.status)}>
              {program.status || 'Planning'}
            </Badge>
          </div>
          {program.description && (
            <p className="text-muted-foreground mt-1">{program.description}</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Beneficiaries
            </CardDescription>
            <CardTitle className="text-2xl">{beneficiaryCount || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Projects
            </CardDescription>
            <CardTitle className="text-2xl">{projects?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Start Date</CardDescription>
            <CardTitle className="text-lg">
              {program.start_date ? format(new Date(program.start_date), 'MMM d, yyyy') : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>End Date</CardDescription>
            <CardTitle className="text-lg">
              {program.end_date ? format(new Date(program.end_date), 'MMM d, yyyy') : 'Ongoing'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="indicators" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Indicators</span>
          </TabsTrigger>
          <TabsTrigger value="observations" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Observations</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Program Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Program Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {program.category && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <span className="text-sm font-medium capitalize">{program.category}</span>
                  </div>
                )}
                {program.target_population && program.target_population.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Target Population</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {program.target_population.map((pop: string) => (
                        <Badge key={pop} variant="secondary" className="text-xs">{pop}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {program.objectives && (
                  <div>
                    <span className="text-sm text-muted-foreground">Objectives</span>
                    <p className="text-sm mt-1">{program.objectives}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projects List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Projects ({projects?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {projects?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No projects yet</p>
                ) : (
                  <div className="space-y-2">
                    {projects?.slice(0, 5).map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{project.name}</p>
                          {project.project_code && (
                            <p className="text-xs text-muted-foreground">{project.project_code}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {project.status || 'Active'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick view of indicators */}
          <ProgramIndicators programId={programId} showAddButton={false} />
        </TabsContent>

        <TabsContent value="indicators" className="mt-6">
          <ProgramIndicators programId={programId} />
        </TabsContent>

        <TabsContent value="observations" className="mt-6">
          <ProgramObservations programId={programId} />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ProgramReporting programId={programId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProgramDashboard;
